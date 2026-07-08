"""
Ingest the knowledge corpus (data/knowledge/schemes/*.md, data/knowledge/help/*.md)
into the KnowledgeDocument table so the Recommendation Agent and Ask AI
Assistant Agent have real vector-retrievable grounding instead of the
deterministic SCHEME_LOOKUP fallback.

Run with:  python scripts/ingest_knowledge.py
Re-run any time a source .md file changes — it clears and re-ingests each
file by source_file path, so it's always safe to re-run.

Each markdown file's category is read from its "Category: xxx" line so
adding a new scheme or role guide is just "drop a .md file in the right
folder" — no code change needed.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.session import SessionLocal, init_db
from rag.knowledge_store import clear_document, ingest_document

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
KNOWLEDGE_DIR = REPO_ROOT / "data" / "knowledge"


def _parse_category(content: str) -> str:
    match = re.search(r"^Category:\s*(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else "general"


def _parse_title(content: str) -> str:
    match = re.search(r"^#\s*(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else "Untitled"


def ingest_folder(db, folder: Path, doc_type: str) -> None:
    if not folder.exists():
        print(f"  (skipping {folder} — not found)")
        return
    for md_file in sorted(folder.glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        category = _parse_category(content)
        title = _parse_title(content)
        source_key = str(md_file.relative_to(REPO_ROOT))

        clear_document(db, source_key)
        n_chunks = ingest_document(
            db,
            doc_type=doc_type,
            category=category,
            title=title,
            content=content,
            source_file=source_key,
        )
        print(f"  ingested {source_key}  [category={category}]  -> {n_chunks} chunk(s)")


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        print("Ingesting scheme documents (doc_type=scheme)...")
        ingest_folder(db, KNOWLEDGE_DIR / "schemes", "scheme")

        print("Ingesting help/guidance documents (doc_type=help)...")
        ingest_folder(db, KNOWLEDGE_DIR / "help", "help")

        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
