"""
LokPulse AI — FastAPI backend entrypoint.

Run with:   uvicorn main:app --reload
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if present, before any other imports touch env vars

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents import assistant_agent, duplicate_detection_agent, hotspot_agent, priority_ranking_agent
from db.models import IssueCluster, Recommendation, WardProfile
from db.session import get_db, init_db
from graph.pipeline import process_new_submission, score_and_recommend_cluster

# Import your security helpers for password verification and token creation
from security import get_password_hash, verify_password, create_access_token

app = FastAPI(title="LokPulse AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the deployed frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    name: str
    phone: str
    password: str
    role: str
    location: str
    aadhaarVerified: bool


class SubmissionIn(BaseModel):
    citizen_phone_hash: str
    channel: str  # voice | text | photo | whatsapp | sms
    raw_text: Optional[str] = None
    image_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    ward_id: Optional[str] = None


class UpvoteCheckIn(BaseModel):
    category: str
    ward_id: str
    draft_summary: str


class UpvoteApplyIn(BaseModel):
    cluster_id: str
    citizen_phone_hash: str


class WeightsIn(BaseModel):
    unique_reporter_count: float = 0.20
    ward_population: float = 0.20
    distance_to_facility_km: float = 0.15
    infrastructure_gap_index: float = 0.15
    years_since_last_dev_spend: float = 0.10
    emergency_multiplier: float = 0.10
    sc_st_percentage: float = 0.05
    estimated_cost_inr: float = -0.05


class AssistantAskIn(BaseModel):
    role: str  # citizen | mp_office | mla_office | district_admin | panchayat_officer
    page: str  # e.g. "landing" | "submit" | "browse" | "status" | "dashboard" | "district" | "panchayat"
    question: str
    constituency: Optional[str] = None
    ward_id: Optional[str] = None
    citizen_context: Optional[dict] = None


class StatusUpdateIn(BaseModel):
    status: str  # new | under_review | recommended | actioned | resolved


class PanchayatAnnotationIn(BaseModel):
    note: str
    officer_name: str


# ---------------------------------------------------------------------------
# In-Memory Database for Authentication (Hackathon-Scope)
# ---------------------------------------------------------------------------
# Note: In production, wire this to a SQLAlchemy "User" model.
fake_users_db = {}


# ---------------------------------------------------------------------------
# Authentication & Authorization Endpoints
# ---------------------------------------------------------------------------
@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserRegister):
    if user.phone in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Phone number already registered"
        )
    
    # Securely hash the plain-text password before saving
    hashed_password = get_password_hash(user.password)
    
    user_id = f"USR-{str(uuid.uuid4())[:8]}"
    fake_users_db[user.phone] = {
        "id": user_id,
        "name": user.name,
        "phone": user.phone,
        "role": user.role,
        "location": user.location,
        "aadhaarVerified": user.aadhaarVerified,
        "password_hash": hashed_password
    }
    
    return {"message": "User registered successfully"}


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # OAuth2PasswordRequestForm parses incoming 'application/x-www-form-urlencoded' data
    # The frontend maps phone numbers directly to the form's 'username' field
    user = fake_users_db.get(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid credentials"
        )
        
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid credentials"
        )
        
    # Generate the signed secure JWT
    access_token = create_access_token(data={"sub": user["phone"], "role": user["role"]})
    
    # Return payload structures expected cleanly by useAuth() context
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "phone": user["phone"],
            "role": user["role"],
            "location": user["location"],
            "aadhaarVerified": user["aadhaarVerified"]
        }
    }


# ---------------------------------------------------------------------------
# Citizen-facing endpoints
# ---------------------------------------------------------------------------
@app.post("/submissions")
def create_submission(payload: SubmissionIn, db: Session = Depends(get_db)):
    result = process_new_submission(
        db,
        citizen_phone_hash=payload.citizen_phone_hash,
        channel=payload.channel,
        raw_text=payload.raw_text,
        image_url=payload.image_url,
        lat=payload.lat,
        lng=payload.lng,
        ward_id=payload.ward_id,
    )
    return result


@app.post("/upvotes/check")
def check_upvote_match(payload: UpvoteCheckIn, db: Session = Depends(get_db)):
    """Called while the citizen is still composing — Path B of the dedup agent."""
    match = duplicate_detection_agent.path_b_check_for_upvote_match(
        db, payload.category, payload.ward_id, payload.draft_summary
    )
    if not match:
        return {"match_found": False}
    return {
        "match_found": True,
        "cluster_id": match.id,
        "unique_reporter_count": match.unique_reporter_count,
        "one_line_summary": match.one_line_summary,
    }


@app.post("/upvotes/apply")
def apply_upvote(payload: UpvoteApplyIn, db: Session = Depends(get_db)):
    cluster = db.query(IssueCluster).filter(IssueCluster.id == payload.cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    updated = duplicate_detection_agent.path_b_apply_upvote(
        db, cluster, payload.citizen_phone_hash
    )
    return {"cluster_id": updated.id, "unique_reporter_count": updated.unique_reporter_count}


@app.get("/issue-clusters/nearby")
def browse_nearby(ward_id: str, db: Session = Depends(get_db)):
    clusters = (
        db.query(IssueCluster)
        .filter(IssueCluster.ward_id == ward_id)
        .order_by(IssueCluster.unique_reporter_count.desc())
        .limit(20)
        .all()
    )
    return [_cluster_summary(c) for c in clusters]


@app.get("/submissions/status")
def my_submissions_status(citizen_phone_hash: str, db: Session = Depends(get_db)):
    from db.models import Submission

    subs = (
        db.query(Submission)
        .filter(Submission.citizen_phone_hash == citizen_phone_hash)
        .order_by(Submission.timestamp.desc())
        .all()
    )
    out = []
    for s in subs:
        cluster = db.query(IssueCluster).filter(IssueCluster.id == s.cluster_id).first()
        out.append(
            {
                "submission_id": s.id,
                "category": s.category,
                "summary": s.one_line_summary,
                "status": cluster.status.value if cluster else "unknown",
                "timestamp": s.timestamp.isoformat(),
            }
        )
    return out


# ---------------------------------------------------------------------------
# MP / MLA / District / Panchayat dashboard endpoints
# ---------------------------------------------------------------------------
@app.get("/dashboard/top-priorities")
def top_priorities(constituency: str, limit: int = 5, db: Session = Depends(get_db)):
    ward_ids = [
        w.ward_id for w in db.query(WardProfile).filter(WardProfile.constituency == constituency)
    ]
    clusters = (
        db.query(IssueCluster)
        .filter(IssueCluster.ward_id.in_(ward_ids))
        .order_by(IssueCluster.priority_score.desc())
        .limit(limit)
        .all()
    )
    return [_cluster_summary(c, with_score=True) for c in clusters]


@app.get("/dashboard/heatmap")
def heatmap(constituency: str, db: Session = Depends(get_db)):
    ward_ids = [
        w.ward_id for w in db.query(WardProfile).filter(WardProfile.constituency == constituency)
    ]
    clusters = db.query(IssueCluster).filter(IssueCluster.ward_id.in_(ward_ids)).all()
    return hotspot_agent.compute_hotspots(clusters)


@app.post("/dashboard/rescore")
def rescore_constituency(constituency: str, weights: WeightsIn, db: Session = Depends(get_db)):
    """
    Powers the live priority-weight sliders (Section 9). Recomputes every
    cluster's score with the caller-supplied weights and returns the
    re-ranked list — no recommendation regeneration, just the deterministic
    scoring step, so this is fast enough for live dragging.
    """
    ward_ids = [
        w.ward_id for w in db.query(WardProfile).filter(WardProfile.constituency == constituency)
    ]
    clusters = db.query(IssueCluster).filter(IssueCluster.ward_id.in_(ward_ids)).all()

    custom_weights = weights.dict()
    results = []
    for cluster in clusters:
        ward = db.query(WardProfile).filter(WardProfile.ward_id == cluster.ward_id).first()
        scoring_input = priority_ranking_agent.ScoringInput(
            unique_reporter_count=cluster.unique_reporter_count,
            ward_population=ward.population if ward else 0,
            distance_to_facility_km=ward.nearest_phc_km if ward else 0.0,
            infrastructure_gap_index=0.5,
            years_since_last_dev_spend=ward.years_since_last_dev_spend if ward else 0,
            flood_prone=ward.flood_prone if ward else False,
            acute_urgency_signal=False,
            sc_st_percentage=ward.sc_st_percentage if ward else 0.0,
            estimated_cost_inr=0.0,
            weights=custom_weights,
        )
        score_result = priority_ranking_agent.score(scoring_input)
        results.append((cluster, score_result["priority_score"], score_result["score_breakdown"]))

    results.sort(key=lambda x: x[1], reverse=True)
    return [
        {
            **_cluster_summary(c),
            "priority_score": score,
            "score_breakdown": breakdown,
            "rank": i + 1,
        }
        for i, (c, score, breakdown) in enumerate(results)
    ]


@app.post("/clusters/{cluster_id}/recommendation")
def generate_recommendation_for_cluster(cluster_id: str, db: Session = Depends(get_db)):
    """Powers the 'Regenerate' button on the AI Summary card (Section 9)."""
    cluster = db.query(IssueCluster).filter(IssueCluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")

    result = score_and_recommend_cluster(db, cluster)
    rec_out = result["recommendation"]

    existing = db.query(Recommendation).filter(Recommendation.cluster_id == cluster_id).first()
    if existing:
        for k, v in rec_out.items():
            setattr(existing, k, v)
        existing.generated_at = datetime.utcnow()
    else:
        existing = Recommendation(cluster_id=cluster_id, **rec_out)
        db.add(existing)
    db.commit()

    return {"cluster_id": cluster_id, "score": result["score"], "recommendation": rec_out}


@app.get("/clusters/{cluster_id}")
def get_cluster_detail(cluster_id: str, db: Session = Depends(get_db)):
    cluster = db.query(IssueCluster).filter(IssueCluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    rec = db.query(Recommendation).filter(Recommendation.cluster_id == cluster_id).first()
    return {
        **_cluster_summary(cluster, with_score=True),
        "recommendation": _rec_to_dict(rec) if rec else None,
    }


# ---------------------------------------------------------------------------
# District Administration endpoints — cross-constituency, implementation tracking
# ---------------------------------------------------------------------------
@app.get("/district/constituencies")
def list_constituencies(db: Session = Depends(get_db)):
    """All constituencies with an aggregate rollup, for the District Admin landing view."""
    rows = db.query(WardProfile.constituency).distinct().all()
    constituencies = [r[0] for r in rows]

    out = []
    for c in constituencies:
        ward_ids = [w.ward_id for w in db.query(WardProfile).filter(WardProfile.constituency == c)]
        clusters = db.query(IssueCluster).filter(IssueCluster.ward_id.in_(ward_ids)).all()
        out.append(
            {
                "constituency": c,
                "ward_count": len(ward_ids),
                "total_clusters": len(clusters),
                "total_reports": sum(cl.unique_reporter_count for cl in clusters),
                "actioned_count": sum(1 for cl in clusters if cl.status.value == "actioned"),
                "resolved_count": sum(1 for cl in clusters if cl.status.value == "resolved"),
            }
        )
    return out


@app.get("/district/implementation-tracker")
def implementation_tracker(constituency: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Every cluster with a recommendation, across one or all constituencies,
    for District Admin to link to sanctioned works and mark progress.
    """
    query = db.query(IssueCluster).join(Recommendation, IssueCluster.id == Recommendation.cluster_id)
    if constituency:
        ward_ids = [
            w.ward_id for w in db.query(WardProfile).filter(WardProfile.constituency == constituency)
        ]
        query = query.filter(IssueCluster.ward_id.in_(ward_ids))

    clusters = query.order_by(IssueCluster.priority_score.desc()).all()
    out = []
    for c in clusters:
        rec = db.query(Recommendation).filter(Recommendation.cluster_id == c.id).first()
        out.append({**_cluster_summary(c, with_score=True), "recommendation": _rec_to_dict(rec)})
    return out


@app.patch("/clusters/{cluster_id}/status")
def update_cluster_status(cluster_id: str, payload: StatusUpdateIn, db: Session = Depends(get_db)):
    """District Admin marks a cluster planned/in-progress/completed (Section 3 permissions)."""
    from db.models import ClusterStatusEnum

    cluster = db.query(IssueCluster).filter(IssueCluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")
    if payload.status not in ClusterStatusEnum._value2member_map_:
        raise HTTPException(400, f"Invalid status: {payload.status}")
    cluster.status = ClusterStatusEnum(payload.status)
    db.commit()
    return _cluster_summary(cluster, with_score=True)


# ---------------------------------------------------------------------------
# Panchayat Officer endpoints — ward-level detail, ground-truth annotation
# ---------------------------------------------------------------------------
@app.get("/panchayat/ward/{ward_id}")
def panchayat_ward_detail(ward_id: str, db: Session = Depends(get_db)):
    """Ward/village-level detail view — all clusters for a single ward, full detail."""
    ward = db.query(WardProfile).filter(WardProfile.ward_id == ward_id).first()
    if not ward:
        raise HTTPException(404, "Ward not found")

    clusters = (
        db.query(IssueCluster)
        .filter(IssueCluster.ward_id == ward_id)
        .order_by(IssueCluster.priority_score.desc())
        .all()
    )
    return {
        "ward": {
            "ward_id": ward.ward_id,
            "ward_name": ward.ward_name,
            "constituency": ward.constituency,
            "population": ward.population,
            "literacy_rate": ward.literacy_rate,
            "nearest_phc_km": ward.nearest_phc_km,
            "nearest_school_km": ward.nearest_school_km,
            "flood_prone": ward.flood_prone,
        },
        "clusters": [_cluster_summary(c, with_score=True) for c in clusters],
    }


@app.post("/clusters/{cluster_id}/annotate")
def annotate_cluster(cluster_id: str, payload: PanchayatAnnotationIn, db: Session = Depends(get_db)):
    """
    Panchayat Officer ground-truth correction (e.g. "land already allocated").
    Stored inside score_breakdown's sibling field so it's visible everywhere
    the cluster is rendered, without needing a new table for a hackathon-scope
    build. Cannot approve budgets — enforced by simply not exposing that
    action here (see Section 3 permissions table).
    """
    cluster = db.query(IssueCluster).filter(IssueCluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(404, "Cluster not found")

    breakdown = dict(cluster.score_breakdown or {})
    annotations = breakdown.get("panchayat_annotations", [])
    annotations.append(
        {
            "note": payload.note,
            "officer_name": payload.officer_name,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
    breakdown["panchayat_annotations"] = annotations
    cluster.score_breakdown = breakdown
    db.commit()
    return {"cluster_id": cluster_id, "annotations": annotations}


@app.get("/health")
def health():
    from integrations.llm_client import active_provider
    from integrations.bigquery_client import bigquery_configured
    from integrations.datagovin_client import data_gov_in_configured
    from agents.voice_agent import _local_whisper_available

    return {
        "status": "ok",
        "llm_provider": active_provider() or "mock",
        "bigquery_configured": bigquery_configured(),
        "data_gov_in_configured": data_gov_in_configured(),
        "local_whisper_available": _local_whisper_available(),
    }


@app.get("/datasets/suggest")
def suggest_datasets(category: str):
    """
    Public Dataset Advisor (backend/integrations/bigquery_client.py) —
    returns real data.gov.in / BigQuery-eligible datasets relevant to an
    issue category, each tagged with integration_status and the specific
    work_needed to wire it in live. Powers the dashboard's Data Sources
    panel and Ask AI's answers to "what data would strengthen this."
    """
    from integrations.bigquery_client import suggest_datasets_for_category

    return {"category": category, "suggestions": suggest_datasets_for_category(category)}


# ---------------------------------------------------------------------------
# Ask AI — role-aware, RAG-grounded assistant embedded on every page
# ---------------------------------------------------------------------------
@app.post("/assistant/ask")
def ask_assistant(payload: AssistantAskIn, db: Session = Depends(get_db)):
    valid_roles = {"citizen", "mp_office", "mla_office", "district_admin", "panchayat_officer"}
    if payload.role not in valid_roles:
        raise HTTPException(400, f"Unknown role: {payload.role}")

    result = assistant_agent.answer(
        db,
        role=payload.role,
        page=payload.page,
        question=payload.question,
        constituency=payload.constituency,
        ward_id=payload.ward_id,
        citizen_context=payload.citizen_context,
    )
    return result


def _cluster_summary(c: IssueCluster, with_score: bool = False) -> dict:
    out = {
        "cluster_id": c.id,
        "category": c.category,
        "ward_id": c.ward_id,
        "unique_reporter_count": c.unique_reporter_count,
        "channel_breakdown": c.channel_breakdown,
        "status": c.status.value if c.status else "new",
        "one_line_summary": c.one_line_summary,
        "centroid": {"lat": c.centroid_lat, "lng": c.centroid_lng},
        "first_reported": c.first_reported.isoformat() if c.first_reported else None,
        "last_reported": c.last_reported.isoformat() if c.last_reported else None,
    }
    if with_score:
        out["priority_score"] = c.priority_score
        out["score_breakdown"] = c.score_breakdown
    return out


def _rec_to_dict(r: Recommendation) -> dict:
    return {
        "recommended_action": r.recommended_action,
        "reasoning": r.reasoning,
        "estimated_budget_inr_cr": r.estimated_budget_inr_cr,
        "expected_beneficiaries": r.expected_beneficiaries,
        "relevant_scheme": r.relevant_scheme,
        "priority_rank": r.priority_rank,
        "estimated_timeline_months": r.estimated_timeline_months,
        "confidence": r.confidence,
        "mp_decision": r.mp_decision.value if r.mp_decision else "pending",
        "suggested_datasets": r.suggested_datasets or [],
    }