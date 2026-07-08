"""
LokPulse AI — orchestration graph.

Wires Sections 5.1-5.8 into one explicit sequence. Built as a plain
Python function chain rather than a full LangGraph StateGraph for this
build (same node boundaries, less infra) — swap to LangGraph's
StateGraph one-for-one later if you want per-node tracing/visual graph
debugging; each function below is already a valid node body.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from agents import (
    classification_agent,
    duplicate_detection_agent,
    priority_ranking_agent,
    recommendation_agent,
    translation_agent,
    vision_agent,
    voice_agent,
)
from db.models import ChannelEnum, Submission, UrgencyEnum, WardProfile


def process_new_submission(
    db: Session,
    citizen_phone_hash: str,
    channel: str,
    raw_text: str | None = None,
    audio_bytes: bytes | None = None,
    image_url: str | None = None,
    image_bytes: bytes | None = None,
    lat: float | None = None,
    lng: float | None = None,
    ward_id: str | None = None,
) -> dict:
    """
    Full intake -> classification -> dedup pipeline for one citizen
    submission. Returns the persisted Submission + the IssueCluster it
    landed in (new or merged).
    """
    # --- 1. Voice Agent (only runs for voice channel) ---
    if channel == "voice":
        voice_out = voice_agent.transcribe(audio_bytes)
        raw_text = voice_out["raw_transcript"]

    # --- 2. Vision Agent (only runs if an image was attached) ---
    vision_out = None
    if image_url:
        vision_out = vision_agent.analyze_image(image_url)
        if lat is None and image_bytes:
            exif_geo = vision_agent.extract_exif_geolocation(image_bytes)
            if exif_geo:
                lat, lng = exif_geo["lat"], exif_geo["lng"]

    # --- 3. Translation Agent ---
    translation_out = translation_agent.translate(raw_text or "")
    translated_text = translation_out.get("translated_text", raw_text)

    # --- 4. Classification Agent ---
    classification_out = classification_agent.classify(translated_text, vision_out)
    category = classification_out.get("category", "Other")
    urgency_raw = classification_out.get("urgency_signal", "none")
    one_line_summary = classification_out.get("one_line_summary", translated_text[:120])

    # Resolve ward_id: prefer explicit input, else leave for manual
    # geocode step (real system reverse-geocodes lat/lng via Google Maps
    # Platform here).
    resolved_ward_id = ward_id

    submission = Submission(
        citizen_phone_hash=citizen_phone_hash,
        channel=ChannelEnum(channel),
        raw_transcript=raw_text,
        translated_text=translated_text,
        image_url=image_url,
        image_analysis=vision_out,
        category=category,
        urgency_signal=UrgencyEnum(urgency_raw) if urgency_raw in UrgencyEnum._value2member_map_ else UrgencyEnum.none,
        lat=lat,
        lng=lng,
        ward_id=resolved_ward_id,
        one_line_summary=one_line_summary,
        timestamp=datetime.utcnow(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # --- 5. Duplicate Detection Agent (Path A) ---
    cluster, is_new = duplicate_detection_agent.path_a_automatic_dedup(
        db,
        category=category,
        ward_id=resolved_ward_id or "UNKNOWN",
        one_line_summary=one_line_summary,
        lat=lat,
        lng=lng,
        channel=channel,
    )
    submission.cluster_id = cluster.id
    db.commit()

    return {
        "submission_id": submission.id,
        "cluster_id": cluster.id,
        "is_new_cluster": is_new,
        "category": category,
        "one_line_summary": one_line_summary,
    }


def score_and_recommend_cluster(db: Session, cluster) -> dict:
    """
    Runs Priority Ranking (deterministic) then Recommendation Agent
    (RAG-grounded LLM call) for a single cluster. Called by the batch
    scoring job and by the dashboard's "Regenerate" button (Section 9).
    """
    ward = db.query(WardProfile).filter(WardProfile.ward_id == cluster.ward_id).first()

    scoring_input = priority_ranking_agent.ScoringInput(
        unique_reporter_count=cluster.unique_reporter_count,
        ward_population=ward.population if ward else 0,
        distance_to_facility_km=(ward.nearest_phc_km if ward else 0.0),
        infrastructure_gap_index=_infra_gap_index(ward),
        years_since_last_dev_spend=ward.years_since_last_dev_spend if ward else 0,
        flood_prone=ward.flood_prone if ward else False,
        acute_urgency_signal=_cluster_has_acute_signal(db, cluster),
        sc_st_percentage=ward.sc_st_percentage if ward else 0.0,
        estimated_cost_inr=0.0,  # unknown until a recommendation exists; refined below
    )
    score_result = priority_ranking_agent.score(scoring_input)
    cluster.priority_score = score_result["priority_score"]
    cluster.score_breakdown = score_result["score_breakdown"]
    db.commit()

    rec_out = recommendation_agent.generate_recommendation(
        db, cluster, score_result["score_breakdown"]
    )

    return {"cluster_id": cluster.id, "score": score_result, "recommendation": rec_out}


def _infra_gap_index(ward: WardProfile | None) -> float:
    """
    Simple composite proxy: worse (higher) when literacy/health indices
    are low and facility distance is high. Kept as plain arithmetic
    per the "deterministic, explainable" architecture principle —
    no LLM judgement call hidden inside a supposedly transparent score.
    """
    if not ward:
        return 0.5
    literacy_gap = max(0.0, 1 - (ward.literacy_rate / 100.0))
    health_gap = max(0.0, 1 - (ward.health_index / 100.0))
    return round((literacy_gap + health_gap) / 2, 4)


def _cluster_has_acute_signal(db: Session, cluster) -> bool:
    acute = (
        db.query(Submission)
        .filter(
            Submission.cluster_id == cluster.id,
            Submission.urgency_signal == UrgencyEnum.acute_recent_incident,
        )
        .first()
    )
    return acute is not None
