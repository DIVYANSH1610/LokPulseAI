"""
Duplicate Detection & Upvote Agent — Section 5.5

Not a generative prompt. Embedding + cosine-similarity clustering, with
two entry points:

  Path A — automatic dedup (background), called after full pipeline
           processing of a new submission.
  Path B — citizen-initiated upvote (proactive, UI-facing), called as
           the citizen is typing/speaking, before they finish submitting.

Both paths converge on the same `issue_clusters` table.
"""
from __future__ import annotations

import math
from datetime import datetime

from sqlalchemy.orm import Session

from db.models import IssueCluster
from integrations.llm_client import embed_text

SIMILARITY_THRESHOLD = 0.82  # tune during testing, per spec


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def build_embedding_text(category: str, one_line_summary: str, ward_id: str) -> str:
    return f"{category} + {one_line_summary} + {ward_id}"


def find_candidate_clusters(
    db: Session, category: str, ward_id: str, embedding: list[float], limit: int = 20
) -> list[tuple[IssueCluster, float]]:
    """
    Restrict the candidate pool to same category + same ward before running
    cosine similarity (cheap pre-filter; pgvector would do the geo-radius +
    vector search in a single indexed query in production).
    """
    candidates = (
        db.query(IssueCluster)
        .filter(IssueCluster.category == category, IssueCluster.ward_id == ward_id)
        .order_by(IssueCluster.last_reported.desc())
        .limit(limit)
        .all()
    )
    scored = [
        (c, _cosine_similarity(embedding, c.representative_embedding or []))
        for c in candidates
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def path_a_automatic_dedup(
    db: Session,
    category: str,
    ward_id: str,
    one_line_summary: str,
    lat: float | None,
    lng: float | None,
    channel: str,
) -> tuple[IssueCluster, bool]:
    """
    Returns (cluster, is_new_cluster). Called after a submission has been
    fully processed by upstream agents.
    """
    embedding_text = build_embedding_text(category, one_line_summary, ward_id)
    embedding = embed_text(embedding_text)

    scored = find_candidate_clusters(db, category, ward_id, embedding)
    if scored and scored[0][1] > SIMILARITY_THRESHOLD:
        cluster = scored[0][0]
        cluster.unique_reporter_count += 1
        cluster.last_reported = datetime.utcnow()
        breakdown = dict(cluster.channel_breakdown or {})
        breakdown[channel] = breakdown.get(channel, 0) + 1
        cluster.channel_breakdown = breakdown
        db.commit()
        return cluster, False

    cluster = IssueCluster(
        category=category,
        ward_id=ward_id,
        centroid_lat=lat,
        centroid_lng=lng,
        unique_reporter_count=1,
        upvote_records=[],
        channel_breakdown={channel: 1},
        one_line_summary=one_line_summary,
        representative_embedding=embedding,
    )
    db.add(cluster)
    db.commit()
    db.refresh(cluster)
    return cluster, True


def path_b_check_for_upvote_match(
    db: Session, category: str, ward_id: str, draft_summary: str
) -> IssueCluster | None:
    """
    Near-real-time check called while the citizen is still composing their
    submission, so the UI can offer "N people nearby reported this —
    upvote instead?" before they hit send.
    """
    embedding = embed_text(build_embedding_text(category, draft_summary, ward_id))
    scored = find_candidate_clusters(db, category, ward_id, embedding, limit=5)
    if scored and scored[0][1] > SIMILARITY_THRESHOLD:
        return scored[0][0]
    return None


def path_b_apply_upvote(db: Session, cluster: IssueCluster, citizen_phone_hash: str) -> IssueCluster:
    """
    Skips full pipeline reprocessing entirely — just increments the count
    and appends a lightweight upvote record.
    """
    records = list(cluster.upvote_records or [])
    records.append(
        {"citizen_phone_hash": citizen_phone_hash, "timestamp": datetime.utcnow().isoformat()}
    )
    cluster.upvote_records = records
    cluster.unique_reporter_count += 1
    cluster.last_reported = datetime.utcnow()
    db.commit()
    db.refresh(cluster)
    return cluster
