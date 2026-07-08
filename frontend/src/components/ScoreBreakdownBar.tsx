"use client";

import { ScoreBreakdown } from "@/lib/api";

const COMPONENT_LABELS: Record<string, string> = {
  unique_reporter_count: "Citizen reports",
  ward_population: "Ward population",
  distance_to_facility_km: "Distance to facility",
  infrastructure_gap_index: "Infrastructure gap",
  years_since_last_dev_spend: "Years since dev spend",
  emergency_multiplier: "Emergency signal",
  sc_st_percentage: "SC/ST population",
  estimated_cost_inr: "Estimated cost (penalty)",
};

const COMPONENT_COLORS: Record<string, string> = {
  unique_reporter_count: "#1b7a72",
  ward_population: "#2c5580",
  distance_to_facility_km: "#0f2c4c",
  infrastructure_gap_index: "#5f9ea8",
  years_since_last_dev_spend: "#8fb8ad",
  emergency_multiplier: "#d98e2b",
  sc_st_percentage: "#a9c5be",
  estimated_cost_inr: "#c9483c",
};

/**
 * This is LokPulse's signature visual: instead of a single opaque "score,"
 * every component that fed the number is shown as a proportional segment,
 * with its raw weighted contribution labeled. An MP's office should never
 * have to trust the ranking — they should be able to see it.
 */
export function ScoreBreakdownBar({ breakdown }: { breakdown: ScoreBreakdown }) {
  // Added guard clause to handle loading state and prevent TypeError
  if (!breakdown?.weighted_contributions) {
    return <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />;
  }

  const contributions = Object.entries(breakdown.weighted_contributions).filter(
    ([, v]) => v !== 0
  );
  
  const total = contributions.reduce((sum, [, v]) => sum + Math.max(v, 0), 0);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-[var(--border)]">
        {contributions.map(([key, value]) => {
          const widthPct = total > 0 ? (Math.max(value, 0) / total) * 100 : 0;
          if (widthPct <= 0) return null;
          return (
            <div
              key={key}
              style={{ width: `${widthPct}%`, backgroundColor: COMPONENT_COLORS[key] }}
              title={`${COMPONENT_LABELS[key]}: ${value >= 0 ? "+" : ""}${value.toFixed(3)}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {contributions.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COMPONENT_COLORS[key] }}
            />
            <span>{COMPONENT_LABELS[key] ?? key}</span>
            <span className="font-data text-[var(--ink)]">
              {value >= 0 ? "+" : ""}
              {value.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}