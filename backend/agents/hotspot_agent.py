"""
Hotspot Detection Agent — Section 5.6

Deterministic geo-density clustering over issue_cluster centroids. No LLM
call — this is pure geometry, feeding the heatmap layer directly.

Uses a simple grid-density bucketing approach (fast, dependency-light,
good enough for a constituency-scale demo). Swap for scikit-learn's
DBSCAN if tighter cluster shapes are needed later.
"""
from __future__ import annotations

import math
from collections import defaultdict

from db.models import IssueCluster

GRID_CELL_DEGREES = 0.01  # ~1.1km at India's latitude — tune per constituency density


def _cell_key(lat: float, lng: float) -> tuple[int, int]:
    return (math.floor(lat / GRID_CELL_DEGREES), math.floor(lng / GRID_CELL_DEGREES))


def compute_hotspots(clusters: list[IssueCluster]) -> list[dict]:
    """
    Buckets issue_clusters into grid cells and returns one heatmap point
    per cell with an aggregate weight (sum of unique_reporter_count),
    dominant category, and cell bounding box for map rendering.
    """
    buckets: dict[tuple[int, int], list[IssueCluster]] = defaultdict(list)
    for c in clusters:
        if c.centroid_lat is None or c.centroid_lng is None:
            continue
        buckets[_cell_key(c.centroid_lat, c.centroid_lng)].append(c)

    hotspots = []
    for (row, col), members in buckets.items():
        total_weight = sum(m.unique_reporter_count for m in members)
        category_counts: dict[str, int] = defaultdict(int)
        for m in members:
            category_counts[m.category] += m.unique_reporter_count
        dominant_category = max(category_counts, key=category_counts.get)

        avg_lat = sum(m.centroid_lat for m in members) / len(members)
        avg_lng = sum(m.centroid_lng for m in members) / len(members)

        hotspots.append(
            {
                "lat": avg_lat,
                "lng": avg_lng,
                "weight": total_weight,
                "cluster_count": len(members),
                "dominant_category": dominant_category,
                "cluster_ids": [m.id for m in members],
            }
        )

    hotspots.sort(key=lambda h: h["weight"], reverse=True)
    return hotspots
