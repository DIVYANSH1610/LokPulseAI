"""
LokPulse AI — database models.

Using SQLite + SQLAlchemy for the hackathon build (zero setup, runs anywhere).
Swap DATABASE_URL to a Postgres/Neon connection string with pgvector enabled
for production — the embedding columns below are stored as JSON floats for
now and would become `Vector(768)` columns via pgvector at that point.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def gen_id() -> str:
    return str(uuid.uuid4())


class ChannelEnum(str, enum.Enum):
    voice = "voice"
    text = "text"
    photo = "photo"
    whatsapp = "whatsapp"
    sms = "sms"


class UrgencyEnum(str, enum.Enum):
    none = "none"
    recurring_seasonal = "recurring_seasonal"
    acute_recent_incident = "acute_recent_incident"


class ClusterStatusEnum(str, enum.Enum):
    new = "new"
    under_review = "under_review"
    recommended = "recommended"
    actioned = "actioned"
    resolved = "resolved"


class DecisionEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    modified = "modified"


class RoleEnum(str, enum.Enum):
    citizen = "citizen"
    mp_office = "mp_office"
    mla_office = "mla_office"
    district_admin = "district_admin"
    panchayat_officer = "panchayat_officer"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=gen_id)
    citizen_phone_hash = Column(String, nullable=False, index=True)
    channel = Column(Enum(ChannelEnum), nullable=False)

    raw_transcript = Column(Text, nullable=True)
    translated_text = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    image_analysis = Column(JSON, nullable=True)  # Vision Agent output

    category = Column(String, nullable=True, index=True)
    urgency_signal = Column(Enum(UrgencyEnum), default=UrgencyEnum.none)

    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    ward_id = Column(String, ForeignKey("ward_profiles.ward_id"), nullable=True, index=True)

    one_line_summary = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)  # list[float]; pgvector column in prod

    cluster_id = Column(String, ForeignKey("issue_clusters.id"), nullable=True, index=True)

    timestamp = Column(DateTime, default=datetime.utcnow)

    cluster = relationship("IssueCluster", back_populates="submissions")


class IssueCluster(Base):
    __tablename__ = "issue_clusters"

    id = Column(String, primary_key=True, default=gen_id)
    category = Column(String, nullable=False, index=True)
    ward_id = Column(String, ForeignKey("ward_profiles.ward_id"), nullable=False, index=True)

    centroid_lat = Column(Float, nullable=True)
    centroid_lng = Column(Float, nullable=True)

    unique_reporter_count = Column(Integer, default=0)  # fresh + upvotes combined
    upvote_records = Column(JSON, default=list)  # [{citizen_phone_hash, timestamp}]
    channel_breakdown = Column(JSON, default=dict)  # {whatsapp: n, sms: n, ...}

    first_reported = Column(DateTime, default=datetime.utcnow)
    last_reported = Column(DateTime, default=datetime.utcnow)

    priority_score = Column(Float, default=0.0, index=True)
    score_breakdown = Column(JSON, default=dict)

    status = Column(Enum(ClusterStatusEnum), default=ClusterStatusEnum.new)

    one_line_summary = Column(Text, nullable=True)
    representative_embedding = Column(JSON, nullable=True)

    submissions = relationship("Submission", back_populates="cluster")
    recommendation = relationship(
        "Recommendation", back_populates="cluster", uselist=False
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=gen_id)
    cluster_id = Column(String, ForeignKey("issue_clusters.id"), nullable=False, unique=True)

    recommended_action = Column(Text, nullable=False)
    reasoning = Column(JSON, default=list)  # list[str]
    estimated_budget_inr_cr = Column(Float, default=0.0)
    expected_beneficiaries = Column(Integer, default=0)
    relevant_scheme = Column(String, nullable=True)
    priority_rank = Column(Integer, nullable=True)
    estimated_timeline_months = Column(Integer, nullable=True)
    confidence = Column(Float, default=0.0)
    suggested_datasets = Column(JSON, default=list)  # from integrations/bigquery_client.py — deterministic, not LLM-generated

    mp_decision = Column(Enum(DecisionEnum), default=DecisionEnum.pending)
    decided_by = Column(String, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)

    generated_at = Column(DateTime, default=datetime.utcnow)

    cluster = relationship("IssueCluster", back_populates="recommendation")


class WardProfile(Base):
    __tablename__ = "ward_profiles"

    ward_id = Column(String, primary_key=True)
    ward_name = Column(String, nullable=False)
    constituency = Column(String, nullable=False, index=True)
    population = Column(Integer, default=0)
    sc_st_percentage = Column(Float, default=0.0)
    nearest_phc_km = Column(Float, default=0.0)
    nearest_school_km = Column(Float, default=0.0)
    literacy_rate = Column(Float, default=0.0)
    health_index = Column(Float, default=0.0)
    flood_prone = Column(Boolean, default=False)
    air_quality_index = Column(Float, default=0.0)
    existing_schemes_active = Column(JSON, default=list)
    years_since_last_dev_spend = Column(Integer, default=0)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    constituency_scope = Column(String, nullable=True)
    ward_scope = Column(String, nullable=True)
    auth_provider_id = Column(String, nullable=True)


class KnowledgeDocument(Base):
    """
    Backing store for the RAG layer used by two consumers:

      - Recommendation Agent (Section 5.8) — doc_type="scheme", category is
        the issue category ("Health", "Road", ...). Replaces the old
        deterministic SCHEME_LOOKUP dict with real vector retrieval over
        government scheme descriptions.
      - Ask AI Assistant Agent — doc_type="help", category is the role
        ("citizen", "mp_office", "mla_office", "district_admin",
        "panchayat_officer") or "general" for platform-wide guidance.

    Each row is one chunk (~150-300 words) of a source document, so a long
    scheme PDF or help guide becomes several rows — this keeps retrieval
    precision higher than embedding one giant document per source.
    Embeddings are stored as JSON floats to match the rest of this
    codebase's SQLite-first pattern (see Submission.embedding /
    IssueCluster.representative_embedding) — swap for a pgvector `Vector`
    column in production for indexed similarity search instead of the
    linear scan used here.
    """

    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=gen_id)
    doc_type = Column(String, nullable=False, index=True)  # "scheme" | "help"
    category = Column(String, nullable=False, index=True)  # issue category or role
    title = Column(String, nullable=False)
    source_file = Column(String, nullable=True)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # list[float]; pgvector column in prod
