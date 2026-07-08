"""
BigQuery integration + Public Dataset Advisor.

Two jobs, both gracefully degrading when BigQuery isn't wired up yet
(which is the expected state for most local/demo runs — this module
never raises just because BIGQUERY_PROJECT_ID is unset):

  1. `refresh_ward_profiles_from_bigquery` — pulls real ward-level rows
     from a BigQuery table into the local `ward_profiles` table when
     configured. This is the "Public Data Integration" piece from
     Section 8 of the project spec (Census, CPCB, IMD, school/PHC
     locations) — one real dataset wired in beats five stubbed ones.

  2. `suggest_datasets_for_category` — a curated catalog mapping each
     issue category to the real public datasets (data.gov.in resources,
     Census/NFHS, CPCB, IMD, AISHE, UDISE+) that would strengthen a
     recommendation in that category, each tagged with what integration
     work remains. This answers "what data should we plug in next and
     what's left to do" directly — surfaced via GET /datasets/suggest
     and folded into Ask AI's answers for official roles.
"""
from __future__ import annotations

import os

BIGQUERY_PROJECT_ID = os.getenv("BIGQUERY_PROJECT_ID", "")
BIGQUERY_CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BIGQUERY", "")


def bigquery_configured() -> bool:
    return bool(BIGQUERY_PROJECT_ID)


# ---------------------------------------------------------------------------
# 1. Live BigQuery pull (no-op until BIGQUERY_PROJECT_ID is set)
# ---------------------------------------------------------------------------

def refresh_ward_profiles_from_bigquery(db, dataset: str = "lokpulse_public_data", table: str = "ward_profiles") -> dict:
    """
    Pulls ward-level public data from BigQuery and upserts it into the
    local `ward_profiles` table (Section 7 schema: population,
    sc_st_percentage, nearest_phc_km, nearest_school_km, literacy_rate,
    health_index, flood_prone, air_quality_index).

    Expects a BigQuery table already populated from the source datasets
    below (Census/NFHS + CPCB + IMD + district infra lists joined
    upstream, e.g. via a scheduled dbt/Dataflow job — that join is
    intentionally out of scope for this function, which only pulls the
    final joined table).

    Returns a status dict rather than raising when unconfigured, so this
    is always safe to call from a startup script or a scheduled refresh
    job without needing a separate "is this even set up" check first.
    """
    if not bigquery_configured():
        return {
            "status": "skipped",
            "reason": "BIGQUERY_PROJECT_ID not set — using locally seeded ward_profiles instead.",
            "how_to_enable": (
                "1) Create a BigQuery dataset and load the joined public-data table "
                "(see DATASET_CATALOG below for source datasets per category). "
                "2) pip install google-cloud-bigquery. "
                "3) Set BIGQUERY_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS_BIGQUERY in backend/.env. "
                "4) Re-run this function (e.g. via scripts/refresh_bigquery_data.py)."
            ),
        }

    try:
        from google.cloud import bigquery  # lazy import — optional dependency
    except ImportError:
        return {
            "status": "error",
            "reason": "google-cloud-bigquery is not installed. Run: pip install google-cloud-bigquery --break-system-packages",
        }

    from db.models import WardProfile

    # Use a dedicated service account for BigQuery specifically if one is
    # configured, rather than silently falling back to whatever
    # GOOGLE_APPLICATION_CREDENTIALS happens to point to (that's meant for
    # Cloud Speech-to-Text in voice_agent.py — a different service account
    # with different scopes). Falls back to default ADC only if neither
    # is explicitly set for BigQuery.
    if BIGQUERY_CREDENTIALS_PATH:
        from google.oauth2 import service_account

        credentials = service_account.Credentials.from_service_account_file(BIGQUERY_CREDENTIALS_PATH)
        client = bigquery.Client(project=BIGQUERY_PROJECT_ID, credentials=credentials)
    else:
        client = bigquery.Client(project=BIGQUERY_PROJECT_ID)
    query = f"SELECT * FROM `{BIGQUERY_PROJECT_ID}.{dataset}.{table}`"
    rows = list(client.query(query).result())

    updated, created = 0, 0
    for row in rows:
        existing = db.query(WardProfile).filter(WardProfile.ward_id == row["ward_id"]).first()
        fields = dict(
            population=row.get("population"),
            sc_st_percentage=row.get("sc_st_percentage"),
            nearest_phc_km=row.get("nearest_phc_km"),
            nearest_school_km=row.get("nearest_school_km"),
            literacy_rate=row.get("literacy_rate"),
            health_index=row.get("health_index"),
            flood_prone=row.get("flood_prone"),
            air_quality_index=row.get("air_quality_index"),
        )
        if existing:
            for k, v in fields.items():
                if v is not None:
                    setattr(existing, k, v)
            updated += 1
        else:
            db.add(WardProfile(ward_id=row["ward_id"], constituency=row.get("constituency", ""), **fields))
            created += 1

    db.commit()
    return {"status": "ok", "rows_fetched": len(rows), "updated": updated, "created": created}


# ---------------------------------------------------------------------------
# 2. Public Dataset Advisor — curated catalog + integration status
# ---------------------------------------------------------------------------

DATASET_CATALOG: dict[str, list[dict]] = {
    "Health": [
        {
            "name": "National Family Health Survey (NFHS-5)",
            "source": "data.gov.in / rchiips.org",
            "url": "https://main.mohfw.gov.in/basicpage-14",
            "feeds_field": "health_index, population",
            "integration_status": "not_wired",
            "work_needed": "Download district-level NFHS-5 factsheets, extract health indicators per ward via district-to-ward mapping, load into BigQuery ward_profiles table.",
        },
        {
            "name": "Health Management Information System (HMIS) facility list",
            "source": "data.gov.in",
            "url": "https://data.gov.in/catalog/health-management-information-system",
            "feeds_field": "nearest_phc_km",
            "integration_status": "not_wired",
            "work_needed": "Geocode PHC/CHC facility list, compute nearest-facility distance per ward centroid (Google Maps Distance Matrix or haversine).",
        },
    ],
    "Road": [
        {
            "name": "PMGSY Road Works Database",
            "source": "pmgsy.nic.in / data.gov.in",
            "url": "https://pmgsy.nic.in/",
            "feeds_field": "infrastructure_gap_index, existing_schemes_active",
            "integration_status": "not_wired",
            "work_needed": "Pull sanctioned/completed PMGSY works by district, flag wards with no recent road works as higher infrastructure gap.",
        },
        {
            "name": "IMD Rainfall & Flood Historical Data",
            "source": "mausam.imd.gov.in",
            "url": "https://mausam.imd.gov.in/",
            "feeds_field": "flood_prone",
            "integration_status": "seeded (mocked in ward_profiles_seed.csv)",
            "work_needed": "Replace seeded flood_prone booleans with a real threshold rule over historical monsoon rainfall/flood-event records per district.",
        },
    ],
    "Education": [
        {
            "name": "UDISE+ School Data",
            "source": "udiseplus.gov.in",
            "url": "https://udiseplus.gov.in/",
            "feeds_field": "nearest_school_km, literacy_rate context",
            "integration_status": "not_wired",
            "work_needed": "Pull school locations + enrollment/dropout figures by district, geocode and join to ward centroids.",
        },
    ],
    "Water": [
        {
            "name": "Jal Jeevan Mission Dashboard (tap connection coverage)",
            "source": "jaljeevanmission.gov.in",
            "url": "https://ejalshakti.gov.in/JJM/JJMReports/",
            "feeds_field": "infrastructure_gap_index",
            "integration_status": "not_wired",
            "work_needed": "Pull village-level tap connection coverage percentage as a direct infrastructure gap signal for Water-category clusters.",
        },
    ],
    "Electricity": [
        {
            "name": "DDUGJY / Saubhagya Village Electrification Data",
            "source": "data.gov.in",
            "url": "https://saubhagya.gov.in/",
            "feeds_field": "infrastructure_gap_index",
            "integration_status": "not_wired",
            "work_needed": "Pull village electrification completion status; flag villages below full-coverage as a gap signal.",
        },
    ],
    "Sanitation": [
        {
            "name": "Swachh Bharat Mission (Gramin) Dashboard",
            "source": "sbm.gov.in",
            "url": "https://sbm.gov.in/sbmreport/home.aspx",
            "feeds_field": "infrastructure_gap_index",
            "integration_status": "not_wired",
            "work_needed": "Pull ODF/ODF+ status and solid waste management coverage per village.",
        },
    ],
    "Agriculture": [
        {
            "name": "State Agriculture Department Crop/Rainfall Data",
            "source": "data.gov.in (state-specific)",
            "url": "https://data.gov.in/sector/agriculture",
            "feeds_field": "context for Agriculture-category clusters",
            "integration_status": "not_wired",
            "work_needed": "Identify the relevant state's agriculture department open-data portal, pull rainfall/yield data to cross-check crop-damage-related reports.",
        },
    ],
    "general": [
        {
            "name": "Census 2011 / Population Projections",
            "source": "censusindia.gov.in / data.gov.in",
            "url": "https://censusindia.gov.in/census.website/data",
            "feeds_field": "population, sc_st_percentage (every ward, every category)",
            "integration_status": "seeded (ward_profiles_seed.csv)",
            "work_needed": "Replace seeded figures with real village/ward-level Census 2011 primary census abstract data, joined via village census code.",
        },
        {
            "name": "CPCB Air Quality Index",
            "source": "cpcb.nic.in",
            "url": "https://cpcb.nic.in/air-quality-data/",
            "feeds_field": "air_quality_index",
            "integration_status": "not_wired",
            "work_needed": "Pull nearest CPCB monitoring station's AQI as a proxy for ward-level air quality where no station exists at ward granularity.",
        },
    ],
}


def suggest_datasets_for_category(category: str) -> list[dict]:
    """
    Returns the curated dataset suggestions for a category, always
    including the `general` (Census/CPCB) entries as baseline context
    regardless of category, since population and air quality data are
    relevant to every recommendation.
    """
    specific = DATASET_CATALOG.get(category, [])
    general = DATASET_CATALOG.get("general", [])
    return specific + general
