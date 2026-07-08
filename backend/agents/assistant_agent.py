"""
Ask AI Assistant Agent

Powers the "Ask AI" button present on every page of the frontend
(components/AskAI.tsx). Not a general-purpose chatbot — it's scoped to
two jobs:

  1. Site guidance: "How do I upload a photo?", "What does the
     confidence score mean?", "Why can't I approve a budget here?"
     Grounded in data/knowledge/help/*.md via the same RAG layer used
     by the Recommendation Agent (rag/knowledge_store.py), scoped to the
     caller's role with a "general" fallback.

  2. Live-data questions from officials: "What's ranked #1 right now?"
     For non-citizen roles, a small amount of real, currently-displayed
     data is fetched and injected as additional grounding — so an MP
     office user asking "what's our top priority" gets a real answer,
     not a generic description of the dashboard.

Citizens get guidance only, never another citizen's report data — role
scoping here mirrors the permissions table in the project README exactly.
"""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from db.models import IssueCluster, WardProfile
from integrations.bigquery_client import suggest_datasets_for_category
from integrations.llm_client import generate_json
from rag.knowledge_store import retrieve as rag_retrieve

SYSTEM_PROMPT = """You are the LokPulse AI "Ask AI" assistant, embedded on every page of the
platform. You help the current user understand the platform and, for
official roles, understand the live data already visible to them.

Rules:
- Answer ONLY using the "Site guidance context" and "Live data context"
  provided below. If neither contains what's needed, say so plainly and
  suggest which page or role would have that information, rather than
  guessing.
- Never invent statistics, scheme names, or figures not present in the
  provided context.
- Keep answers short and directly useful — 2-4 sentences, plus an
  optional short list of suggested next actions the user can take in the
  product right now (e.g. "Open the Priority Weight Sliders").
- Match the tone to a busy government office or a citizen unfamiliar with
  the platform: plain language, no jargon, no filler.

Return strict JSON:
{
  "answer": "...",
  "suggested_actions": ["...", "..."],
  "used_live_data": true/false
}"""

# Which roles are allowed to have live dashboard data injected into their
# context at all — mirrors the permissions table (Section 3 of the README).
# Citizens only ever get their own status data, fetched by the frontend
# and passed in as `citizen_context`, never other citizens' reports.
OFFICIAL_ROLES = {"mp_office", "mla_office", "district_admin", "panchayat_officer"}


def _live_context_for_official(db: Session, role: str, constituency: str | None, ward_id: str | None) -> dict | None:
    """
    Small, cheap, read-only snapshot of what's already on the user's
    screen — top few ranked issues for constituency-scoped roles, or a
    single ward's clusters for the Panchayat Officer. Intentionally not a
    full RAG index over the database; the priority list is short enough
    to just fetch directly.
    """
    if role == "panchayat_officer" and ward_id:
        clusters = (
            db.query(IssueCluster)
            .filter(IssueCluster.ward_id == ward_id)
            .order_by(IssueCluster.priority_score.desc())
            .limit(5)
            .all()
        )
        top_category = clusters[0].category if clusters else None
        return {
            "scope": f"ward {ward_id}",
            "top_issues": [
                {"category": c.category, "summary": c.one_line_summary, "score": c.priority_score, "reports": c.unique_reporter_count}
                for c in clusters
            ],
            "dataset_suggestions_for_top_category": suggest_datasets_for_category(top_category) if top_category else [],
        }

    if role in {"mp_office", "mla_office", "district_admin"} and constituency:
        ward_ids = [w.ward_id for w in db.query(WardProfile).filter(WardProfile.constituency == constituency)]
        clusters = (
            db.query(IssueCluster)
            .filter(IssueCluster.ward_id.in_(ward_ids))
            .order_by(IssueCluster.priority_score.desc())
            .limit(5)
            .all()
        )
        top_category = clusters[0].category if clusters else None
        return {
            "scope": constituency,
            "top_issues": [
                {"category": c.category, "ward_id": c.ward_id, "summary": c.one_line_summary, "score": c.priority_score, "reports": c.unique_reporter_count}
                for c in clusters
            ],
            "dataset_suggestions_for_top_category": suggest_datasets_for_category(top_category) if top_category else [],
        }

    return None


def answer(
    db: Session,
    role: str,
    page: str,
    question: str,
    constituency: str | None = None,
    ward_id: str | None = None,
    citizen_context: dict | None = None,
) -> dict:
    guidance_chunks = rag_retrieve(db, query=f"[{page}] {question}", doc_type="help", category=role, k=3)

    live_data = None
    used_live_data = False
    if role in OFFICIAL_ROLES:
        live_data = _live_context_for_official(db, role, constituency, ward_id)
        used_live_data = live_data is not None
    elif role == "citizen" and citizen_context:
        live_data = citizen_context
        used_live_data = True

    user_content = (
        f"User role: {role}\n"
        f"Current page: {page}\n"
        f"Question: {question}\n\n"
        f"Site guidance context (retrieved): {json.dumps(guidance_chunks)}\n"
        f"Live data context (retrieved, may be null): {json.dumps(live_data)}"
    )

    result = generate_json(SYSTEM_PROMPT, user_content)
    result["used_live_data"] = used_live_data  # trust our own computation, not the model's guess
    result.setdefault("suggested_actions", [])
    return result
