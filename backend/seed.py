"""
Seeds ward_profiles from data/ward_profiles_seed.csv and runs
data/seed_submissions.json through the full agent pipeline, then scores
+ generates recommendations for every resulting cluster.

Run with:  python seed.py   (from inside backend/, with venv active)
"""
from __future__ import annotations

import csv
import json
import os

from dotenv import load_dotenv

load_dotenv()

from db.models import IssueCluster, WardProfile
from db.session import SessionLocal, init_db
from graph.pipeline import process_new_submission, score_and_recommend_cluster
from db.models import Recommendation

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def load_ward_profiles(db):
    path = os.path.join(DATA_DIR, "ward_profiles_seed.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing = db.query(WardProfile).filter(WardProfile.ward_id == row["ward_id"]).first()
            if existing:
                continue
            db.add(
                WardProfile(
                    ward_id=row["ward_id"],
                    ward_name=row["ward_name"],
                    constituency=row["constituency"],
                    population=int(row["population"]),
                    sc_st_percentage=float(row["sc_st_percentage"]),
                    nearest_phc_km=float(row["nearest_phc_km"]),
                    nearest_school_km=float(row["nearest_school_km"]),
                    literacy_rate=float(row["literacy_rate"]),
                    health_index=float(row["health_index"]),
                    flood_prone=row["flood_prone"].strip().lower() == "true",
                    air_quality_index=float(row["air_quality_index"]),
                    existing_schemes_active=[],
                    years_since_last_dev_spend=int(row["years_since_last_dev_spend"]),
                )
            )
    db.commit()
    print(f"Seeded {reader.line_num - 1 if hasattr(reader, 'line_num') else '?'} ward profiles.")


def load_submissions(db):
    path = os.path.join(DATA_DIR, "seed_submissions.json")
    with open(path, encoding="utf-8") as f:
        submissions = json.load(f)

    for s in submissions:
        result = process_new_submission(
            db,
            citizen_phone_hash=s["citizen_phone_hash"],
            channel=s["channel"],
            raw_text=s.get("raw_text"),
            image_url=s.get("image_url"),
            lat=s.get("lat"),
            lng=s.get("lng"),
            ward_id=s.get("ward_id"),
        )
        print(f"  -> submission processed: {result}")


def score_all_clusters(db):
    clusters = db.query(IssueCluster).all()
    for c in clusters:
        result = score_and_recommend_cluster(db, c)
        rec_out = result["recommendation"]
        existing = db.query(Recommendation).filter(Recommendation.cluster_id == c.id).first()
        if not existing:
            db.add(Recommendation(cluster_id=c.id, **rec_out))
        db.commit()
        print(
            f"  -> cluster {c.id[:8]} ({c.category}, ward {c.ward_id}): "
            f"score={result['score']['priority_score']}"
        )


def main():
    init_db()
    db = SessionLocal()
    try:
        print("1/3 Loading ward profiles...")
        load_ward_profiles(db)

        print("2/3 Processing seed submissions through pipeline...")
        load_submissions(db)

        print("3/3 Scoring + generating recommendations for all clusters...")
        score_all_clusters(db)

        print("\nSeed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
