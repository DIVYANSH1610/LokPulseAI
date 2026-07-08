"""
Recommendation Agent — Section 5.8

RAG-grounded: retrieves ward profile, relevant government schemes, and
similar historical recommendations BEFORE generating anything, then
injects that context directly into the prompt. Every claim in the
returned `reasoning[]` must trace back to a retrieved data point — the
prompt explicitly forbids inventing statistics or scheme names.
"""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from db.models import IssueCluster, Recommendation, WardProfile
from integrations.llm_client import generate_json
from rag.knowledge_store import retrieve as rag_retrieve

SYSTEM_PROMPT = """You are generating a development recommendation for an MP's office
based ONLY on the data provided below. Every claim in your reasoning must
directly reference a specific data point given to you. Do not invent
statistics, budget figures, or scheme names not present in the retrieved
context. If retrieved data is insufficient for a confident recommendation,
lower the confidence score accordingly rather than compensating with
generic language.

Return strict JSON:
{
  "recommended_action": "...",
  "reasoning": ["...", "...", "..."],
  "estimated_budget_inr_cr": 0.0,
  "expected_beneficiaries": 0,
  "relevant_scheme": "...",
  "priority_rank": 0,
  "estimated_timeline_months": 0,
  "confidence": 0.0-1.0
}"""


def retrieve_context(db: Session, cluster: IssueCluster) -> dict:
    """
    The RAG retrieval step. `retrieved_schemes` now comes from a real
    vector search over data/knowledge/schemes/*.md (ingested via
    backend/scripts/ingest_knowledge.py into the KnowledgeDocument table),
    scoped to the cluster's category. Falls back to the deterministic
    SCHEME_LOOKUP dict below if the corpus hasn't been ingested yet (e.g.
    a fresh clone that hasn't run the ingestion script), so the pipeline
    never breaks for lack of setup — it just loses retrieval precision.
    `historical_context` is a similarity search over past `recommendations`
    rows filtered by category.
    """
    ward_profile = db.query(WardProfile).filter(WardProfile.ward_id == cluster.ward_id).first()

    similar_past = (
        db.query(Recommendation)
        .join(IssueCluster, Recommendation.cluster_id == IssueCluster.id)
        .filter(IssueCluster.category == cluster.category, IssueCluster.id != cluster.id)
        .order_by(Recommendation.generated_at.desc())
        .limit(3)
        .all()
    )

    scheme_query = f"{cluster.category} government scheme for: {cluster.one_line_summary or cluster.category}"
    retrieved_chunks = rag_retrieve(db, query=scheme_query, doc_type="scheme", category=cluster.category, k=2)

    return {
        "ward_profile_data": _ward_profile_to_dict(ward_profile) if ward_profile else None,
        "retrieved_schemes": retrieved_chunks if retrieved_chunks else lookup_schemes(cluster.category),
        "historical_context": [
            {
                "recommended_action": r.recommended_action,
                "confidence": r.confidence,
                "mp_decision": r.mp_decision.value if r.mp_decision else None,
            }
            for r in similar_past
        ],
    }


def _ward_profile_to_dict(w: WardProfile) -> dict:
    return {
        "ward_id": w.ward_id,
        "ward_name": w.ward_name,
        "population": w.population,
        "sc_st_percentage": w.sc_st_percentage,
        "nearest_phc_km": w.nearest_phc_km,
        "nearest_school_km": w.nearest_school_km,
        "literacy_rate": w.literacy_rate,
        "health_index": w.health_index,
        "flood_prone": w.flood_prone,
        "air_quality_index": w.air_quality_index,
        "existing_schemes_active": w.existing_schemes_active,
        "years_since_last_dev_spend": w.years_since_last_dev_spend,
    }


# Offline fallback only — used when the KnowledgeDocument corpus hasn't
# been ingested yet (see backend/scripts/ingest_knowledge.py). The real
# path is rag.knowledge_store.retrieve() over data/knowledge/schemes/*.md.
SCHEME_LOOKUP = {
    "Road": ["Pradhan Mantri Gram Sadak Yojana (PMGSY)"],
    "Health": ["Ayushman Bharat Health Infrastructure Mission (ABHIM)"],
    "Education": ["Samagra Shiksha Abhiyan"],
    "Water": ["Jal Jeevan Mission"],
    "Electricity": ["Deendayal Upadhyaya Gram Jyoti Yojana (DDUGJY)"],
    "Sanitation": ["Swachh Bharat Mission (Gramin)"],
    "Agriculture": ["Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)"],
}


def lookup_schemes(category: str) -> list[str]:
    return SCHEME_LOOKUP.get(category, ["No pre-mapped scheme — flag for manual review"])


def generate_recommendation(
    db: Session, cluster: IssueCluster, score_breakdown: dict
) -> dict:
    context = retrieve_context(db, cluster)

    user_content = (
        f"Issue cluster: {json.dumps({'category': cluster.category, 'ward_id': cluster.ward_id, 'unique_reporter_count': cluster.unique_reporter_count, 'one_line_summary': cluster.one_line_summary})}\n"
        f"Ward profile: {json.dumps(context['ward_profile_data'])}\n"
        f"Priority score breakdown: {json.dumps(score_breakdown)}\n"
        f"Relevant government schemes (retrieved): {json.dumps(context['retrieved_schemes'])}\n"
        f"Similar past recommendations (if any): {json.dumps(context['historical_context'])}"
    )
    result = generate_json(SYSTEM_PROMPT, user_content)

    # Deterministic, not LLM-generated — appended after the fact so this
    # list can never be hallucinated. See integrations/bigquery_client.py
    # for the full catalog and what integration work each entry still needs.
    from integrations.bigquery_client import suggest_datasets_for_category

    result["suggested_datasets"] = suggest_datasets_for_category(cluster.category)
    return result
