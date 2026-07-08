"""
Find a real data.gov.in resource_id by keyword search — sidesteps the
website's catalog UI (which is JavaScript-rendered and awkward to script
against) by using the community-maintained `datagovindia` package, which
keeps a synced, searchable index of the platform's ~130,000+ resources.

One-time setup:
    pip install datagovindia --break-system-packages
    export DATAGOVINDIA_API_KEY=your-data-gov-in-key   # same key as DATA_GOV_IN_API_KEY
    python scripts/find_dataset.py --sync              # first run only, ~1 min, downloads the resource index

Then search:
    python scripts/find_dataset.py "health infrastructure district"
    python scripts/find_dataset.py "pmgsy road works"
    python scripts/find_dataset.py "jal jeevan mission tap connection"

Each result's `index_name` IS the resource_id — feed it straight into
`integrations/datagovin_client.py`'s `fetch_resource(resource_id, ...)`.
"""
from __future__ import annotations

import argparse
import os
import sys


def main() -> None:
    parser = argparse.ArgumentParser(description="Search data.gov.in for a resource_id by keyword")
    parser.add_argument("keyword", nargs="?", help="Search term, e.g. 'health infrastructure district'")
    parser.add_argument("--sync", action="store_true", help="Sync the local resource metadata index first (run once)")
    parser.add_argument("--limit", type=int, default=8, help="Max results to show")
    args = parser.parse_args()

    try:
        from datagovindia import DataGovIndia
    except ImportError:
        print("Not installed. Run: pip install datagovindia --break-system-packages")
        sys.exit(1)

    api_key = os.getenv("DATAGOVINDIA_API_KEY") or os.getenv("DATA_GOV_IN_API_KEY")
    if not api_key:
        print("Set DATAGOVINDIA_API_KEY (or DATA_GOV_IN_API_KEY) in your shell/.env first.")
        sys.exit(1)

    client = DataGovIndia(api_key=api_key)

    if args.sync:
        print("Syncing resource metadata from data.gov.in (one-time, ~1 min)...")
        client.sync_metadata()
        print("Sync complete.")
        if not args.keyword:
            return

    if not args.keyword:
        print("Provide a search keyword, e.g.: python scripts/find_dataset.py \"health infrastructure\"")
        sys.exit(1)

    results = client.search(args.keyword)
    if results is None or len(results) == 0:
        print(f"No matches for '{args.keyword}'. Try a broader or different term.")
        return

    print(f"\nTop {min(args.limit, len(results))} matches for '{args.keyword}':\n")
    for _, row in results.head(args.limit).iterrows():
        print(f"  resource_id: {row.get('resource_id')}")
        print(f"  title:       {row.get('title')}")
        print(f"  orgs:        {row.get('orgs')}")
        print()

    print("Pick one, then test it with:")
    print('  python -c "from integrations.datagovin_client import fetch_resource; '
          "print(fetch_resource('<resource_id>', limit=5))\"")


if __name__ == "__main__":
    main()
