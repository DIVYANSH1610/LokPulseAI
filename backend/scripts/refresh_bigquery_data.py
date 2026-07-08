"""
Manually trigger a BigQuery -> local ward_profiles refresh.

Safe to run any time: if BIGQUERY_PROJECT_ID isn't set, this prints the
"how_to_enable" instructions and exits cleanly rather than failing.

Run with:  python scripts/refresh_bigquery_data.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.session import SessionLocal, init_db
from integrations.bigquery_client import refresh_ward_profiles_from_bigquery


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        result = refresh_ward_profiles_from_bigquery(db)
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
