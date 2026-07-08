"""
Priority Ranking Agent — Section 5.7

Deterministic scoring function, intentionally NOT an LLM call. This is
the transparency centerpiece of the pitch: judges can see exactly why
issue X outranked issue Y, and MP/MLA offices can drag sliders and watch
the ranking recompute live (Section 9's best live-demo moment).

priority_score =
    0.20 * normalize(unique_reporter_count)
  + 0.20 * normalize(ward_population)
  + 0.15 * normalize(distance_to_relevant_facility_km)
  + 0.15 * normalize(infrastructure_gap_index)
  + 0.10 * normalize(years_since_last_development_spend)
  + 0.10 * emergency_multiplier
  + 0.05 * normalize(sc_st_population_percentage)
  - 0.05 * normalize(estimated_cost_inr)
"""
from __future__ import annotations

from dataclasses import dataclass, field

DEFAULT_WEIGHTS = {
    "unique_reporter_count": 0.20,
    "ward_population": 0.20,
    "distance_to_facility_km": 0.15,
    "infrastructure_gap_index": 0.15,
    "years_since_last_dev_spend": 0.10,
    "emergency_multiplier": 0.10,
    "sc_st_percentage": 0.05,
    "estimated_cost_inr": -0.05,  # negative: higher cost -> lower score
}


@dataclass
class ScoringInput:
    unique_reporter_count: int
    ward_population: int
    distance_to_facility_km: float
    infrastructure_gap_index: float  # 0-1, higher = worse gap
    years_since_last_dev_spend: int
    flood_prone: bool
    acute_urgency_signal: bool
    sc_st_percentage: float  # 0-100
    estimated_cost_inr: float
    weights: dict = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))


def _normalize(value: float, min_v: float, max_v: float) -> float:
    """Min-max normalize to [0, 1]. Bounds should come from the current
    constituency's full dataset in production (passed in by the caller);
    fallback bounds below are reasonable constituency-scale defaults."""
    if max_v == min_v:
        return 0.0
    return max(0.0, min(1.0, (value - min_v) / (max_v - min_v)))


NORMALIZATION_BOUNDS = {
    "unique_reporter_count": (0, 1000),
    "ward_population": (0, 100_000),
    "distance_to_facility_km": (0, 25),
    "years_since_last_dev_spend": (0, 20),
    "sc_st_percentage": (0, 100),
    "estimated_cost_inr": (0, 500_00_00_000),  # 0 to 500 Cr
}


def score(inputs: ScoringInput, bounds: dict | None = None) -> dict:
    """
    Returns the total priority_score plus a full score_breakdown so every
    component is independently auditable in the dashboard's "expand"
    interaction (Section 9).
    """
    b = bounds or NORMALIZATION_BOUNDS
    w = inputs.weights

    emergency_multiplier = 1.0 if (inputs.flood_prone or inputs.acute_urgency_signal) else 0.0

    components = {
        "unique_reporter_count": _normalize(
            inputs.unique_reporter_count, *b["unique_reporter_count"]
        ),
        "ward_population": _normalize(inputs.ward_population, *b["ward_population"]),
        "distance_to_facility_km": _normalize(
            inputs.distance_to_facility_km, *b["distance_to_facility_km"]
        ),
        "infrastructure_gap_index": max(0.0, min(1.0, inputs.infrastructure_gap_index)),
        "years_since_last_dev_spend": _normalize(
            inputs.years_since_last_dev_spend, *b["years_since_last_dev_spend"]
        ),
        "emergency_multiplier": emergency_multiplier,
        "sc_st_percentage": _normalize(inputs.sc_st_percentage, *b["sc_st_percentage"]),
        "estimated_cost_inr": _normalize(inputs.estimated_cost_inr, *b["estimated_cost_inr"]),
    }

    weighted = {k: round(components[k] * w[k], 4) for k in components}
    total = round(sum(weighted.values()), 4)
    # Clamp final score into [0, 1] band for display consistency, since the
    # negative cost term can pull small values slightly below 0.
    total = max(0.0, min(1.0, total))

    return {
        "priority_score": total,
        "score_breakdown": {
            "normalized_components": components,
            "weighted_contributions": weighted,
            "weights_used": w,
        },
    }


def rerank(cluster_scores: list[tuple[str, float]]) -> list[tuple[str, int]]:
    """Given [(cluster_id, priority_score), ...], returns [(cluster_id, rank)]
    sorted descending. Used both by the batch job and by the live
    slider-drag recompute in the dashboard."""
    ordered = sorted(cluster_scores, key=lambda x: x[1], reverse=True)
    return [(cluster_id, i + 1) for i, (cluster_id, _) in enumerate(ordered)]
