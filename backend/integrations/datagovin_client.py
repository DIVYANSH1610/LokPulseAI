"""
data.gov.in Open Government Data (OGD) API client — the genuinely free
alternative to BigQuery for public dataset joins.

Why this exists alongside bigquery_client.py: BigQuery itself is free up
to a generous monthly quota, but *activating* it (or Cloud Speech-to-Text)
requires enabling billing on your GCP project — Google's own billing FAQ
confirms the free tier still needs a card on file. data.gov.in's API needs
only a free account (email signup, no card) at data.gov.in/user/register,
which gives you an API key immediately.

Trade-off, stated plainly: data.gov.in resources are looked up by a
per-dataset `resource_id` (a UUID) that you get from browsing
data.gov.in's catalog yourself — there's no stable, universal "ward
population" resource ID to hardcode here, since dataset availability and
IDs vary by state/scheme and change over time. RESOURCE_HINTS below
points you to the right catalog search terms per category instead of
guessing at IDs that could easily be wrong or stale.
"""
from __future__ import annotations

import os

import httpx

DATA_GOV_IN_API_KEY = os.getenv("DATA_GOV_IN_API_KEY", "")
BASE_URL = "https://api.data.gov.in/resource"


def data_gov_in_configured() -> bool:
    return bool(DATA_GOV_IN_API_KEY)


# Where to find the right resource_id per category — data.gov.in's catalog
# search, not a hardcoded ID, since specific resource IDs shift over time
# and vary by state. Visit the search URL, open a matching dataset, and its
# resource_id is in the dataset's API/Preview tab.
RESOURCE_HINTS: dict[str, dict] = {
    "Health": {
        "catalog_search": "https://www.data.gov.in/search?query=health%20infrastructure%20district",
        "look_for": "District-wise health infrastructure / HMIS facility count datasets",
    },
    "Road": {
        "catalog_search": "https://www.data.gov.in/search?query=pmgsy%20road%20works",
        "look_for": "PMGSY sanctioned/completed road works by district",
    },
    "Education": {
        "catalog_search": "https://www.data.gov.in/search?query=udise%20school",
        "look_for": "UDISE+ school count / enrollment by district",
    },
    "Water": {
        "catalog_search": "https://www.data.gov.in/search?query=jal%20jeevan%20mission%20tap%20connection",
        "look_for": "Jal Jeevan Mission tap connection coverage by district",
    },
    "general": {
        "catalog_search": "https://www.data.gov.in/search?query=census%20population%20district",
        "look_for": "Census population / demographic data by district",
    },
}


def fetch_resource(resource_id: str, filters: dict | None = None, limit: int = 100, offset: int = 0) -> dict:
    """
    Generic fetch against any data.gov.in resource, once you've found its
    resource_id via the catalog search above. Returns the raw API response
    (records under `records`, plus `field` metadata describing columns) —
    every dataset has a different schema, so mapping `records` into
    `ward_profiles` fields is left to a per-dataset script rather than
    guessed at generically here.
    """
    if not data_gov_in_configured():
        return {
            "status": "skipped",
            "reason": "DATA_GOV_IN_API_KEY not set.",
            "how_to_enable": (
                "1) Register free at https://www.data.gov.in/user/register (no card). "
                "2) Copy your API key from your account page. "
                "3) Set DATA_GOV_IN_API_KEY in backend/.env. "
                "4) Find a resource_id via the catalog_search URLs in RESOURCE_HINTS."
            ),
        }

    params = {"api-key": DATA_GOV_IN_API_KEY, "format": "json", "limit": limit, "offset": offset}
    if filters:
        for k, v in filters.items():
            params[f"filters[{k}]"] = v

    resp = httpx.get(f"{BASE_URL}/{resource_id}", params=params, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


def hint_for_category(category: str) -> dict:
    return RESOURCE_HINTS.get(category, RESOURCE_HINTS["general"])
