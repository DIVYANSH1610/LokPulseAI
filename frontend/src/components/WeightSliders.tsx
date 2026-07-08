"use client";

import { Weights } from "@/lib/api";

const SLIDER_META: { key: keyof Weights; label: string; negative?: boolean }[] = [
  { key: "unique_reporter_count", label: "Citizen reports" },
  { key: "ward_population", label: "Ward population" },
  { key: "distance_to_facility_km", label: "Distance to facility" },
  { key: "infrastructure_gap_index", label: "Infrastructure gap" },
  { key: "years_since_last_dev_spend", label: "Years since dev spend" },
  { key: "emergency_multiplier", label: "Emergency signal" },
  { key: "sc_st_percentage", label: "SC/ST population" },
  { key: "estimated_cost_inr", label: "Cost penalty", negative: true },
];

export function WeightSliders({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
}) {
  return (
    <div className="space-y-4">
      {SLIDER_META.map(({ key, label, negative }) => {
        const magnitude = Math.abs(weights[key]);
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--ink-muted)]">{label}</span>
              <span className="font-data text-[var(--ink)]">
                {negative ? "-" : ""}
                {magnitude.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={magnitude}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({ ...weights, [key]: negative ? -v : v });
              }}
              className="w-full accent-[var(--teal-600)]"
            />
          </div>
        );
      })}
    </div>
  );
}
