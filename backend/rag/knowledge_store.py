"""
Knowledge Store — shared RAG layer (Section 4/5.8 of the project spec).

This is the single retrieval seam used by:
  - Recommendation Agent: doc_type="scheme"  -> grounds "relevant_scheme"
  - Ask AI Assistant Agent: doc_type="help"  -> grounds site guidance answers

Same embedding + cosine-similarity pattern as the Duplicate Detection Agent
(agents/duplicate_detection_agent.py), applied to a document corpus instead
of citizen submissions. Kept as a linear scan over JSON-stored embeddings
for the hackathon build (SQLite has no vector index); swap DATABASE_URL to
Postgres + pgvector and replace `_cosine_similarity` scan with a real
`ORDER BY embedding <=> query_embedding LIMIT k` query for production scale
without changing any call sites below.
"""
from __future__ import annotations

import math
import re

from sqlalchemy.orm import Session

from db.models import KnowledgeDocument
from integrations.llm_client import embed_text

CHUNK_WORD_TARGET = 220


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _chunk_text(text: str, target_words: int = CHUNK_WORD_TARGET) -> list[str]:
    """
    Paragraph-aware chunking: group consecutive paragraphs until roughly
    target_words is reached, so a chunk never splits mid-thought. Good
    enough for the markdown source docs in data/knowledge/ — swap for a
    proper recursive splitter if source docs get longer/denser.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for para in paragraphs:
        para_words = len(para.split())
        if current and current_words + para_words > target_words:
            chunks.append("\n\n".join(current))
            current, current_words = [], 0
        current.append(para)
        current_words += para_words

    if current:
        chunks.append("\n\n".join(current))
    return chunks or [text.strip()]


def ingest_document(
    db: Session,
    doc_type: str,
    category: str,
    title: str,
    content: str,
    source_file: str | None = None,
) -> int:
    """
    Chunks + embeds a source document and stores each chunk as a row.
    Returns the number of chunks written. Safe to call repeatedly during
    development — pair with `clear_document` below if you need to re-ingest
    after editing a source file.
    """
    chunks = _chunk_text(content)
    for i, chunk in enumerate(chunks):
        db.add(
            KnowledgeDocument(
                doc_type=doc_type,
                category=category,
                title=title,
                source_file=source_file,
                chunk_index=i,
                content=chunk,
                embedding=embed_text(f"{title}\n\n{chunk}"),
            )
        )
    db.commit()
    return len(chunks)


def clear_document(db: Session, source_file: str) -> None:
    db.query(KnowledgeDocument).filter(KnowledgeDocument.source_file == source_file).delete()
    db.commit()


def retrieve(
    db: Session,
    query: str,
    doc_type: str,
    category: str | None = None,
    k: int = 3,
    fallback_category: str | None = "general",
) -> list[dict]:
    """
    Embeds `query` and returns the top-k most similar chunks, optionally
    scoped to a category (issue category for schemes, role for help docs).

    If a category is given but yields fewer than `k` results, backfills
    from `fallback_category` (e.g. "general" platform-overview docs) so a
    narrow role/category scope never returns an empty context to the LLM.
    """
    q_embedding = embed_text(query)

    def _search(cat: str | None) -> list[KnowledgeDocument]:
        query_set = db.query(KnowledgeDocument).filter(KnowledgeDocument.doc_type == doc_type)
        if cat:
            query_set = query_set.filter(KnowledgeDocument.category == cat)
        return query_set.all()

    docs = _search(category)
    scored = sorted(
        ((d, _cosine_similarity(q_embedding, d.embedding or [])) for d in docs),
        key=lambda x: x[1],
        reverse=True,
    )
    results = scored[:k]

    if len(results) < k and category and fallback_category and category != fallback_category:
        extra_docs = _search(fallback_category)
        extra_scored = sorted(
            ((d, _cosine_similarity(q_embedding, d.embedding or [])) for d in extra_docs),
            key=lambda x: x[1],
            reverse=True,
        )
        results += extra_scored[: k - len(results)]

    return [
        {"title": d.title, "content": d.content, "source_file": d.source_file, "similarity": round(s, 3)}
        for d, s in results
    ]
