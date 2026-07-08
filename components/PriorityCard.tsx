"use client";

import { useState } from "react";
import { ClusterSummary, Recommendation, api } from "@/lib/api";
import { ScoreBreakdownBar } from "./ScoreBreakdownBar";
import { CategoryIcon } from "./icons";

export function PriorityCard({ cluster, rank }: { cluster: ClusterSummary; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    setExpanded((prev) => !prev);
    if (!expanded && !recommendation) {
      setLoading(true);
      setError(null);
      try {
        const detail = await api.clusterDetail(cluster.cluster_id);
        setRecommendation(detail.recommendation);
      } catch {
        setError("Could not load recommendation for this issue.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="card p-4">
      <button
        onClick={handleExpand}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 font-data text-sm text-white">
            {rank}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <CategoryIcon category={cluster.category} className="size-4 text-teal-600" />
              <span className="font-medium text-ink">{cluster.category}</span>
              <span className="text-xs text-ink-muted">· Ward {cluster.ward_id}</span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{cluster.one_line_summary}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-data text-lg text-navy-900">
            {((cluster.priority_score ?? 0) * 100).toFixed(0)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">
            priority
          </div>
        </div>
      </button>

      {cluster.score_breakdown && (
        <div className="mt-3">
          <ScoreBreakdownBar breakdown={cluster.score_breakdown} />
        </div>
      )}

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          {loading && <p className="text-sm text-ink-muted">Loading recommendation…</p>}
          {error && <p className="text-sm text-[#c9483c]">{error}</p>}
          {recommendation && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">
                {recommendation.recommended_action}
              </p>
              <ul className="space-y-1">
                {recommendation.reasoning.map((r, i) => (
                  <li key={i} className="text-sm text-ink-muted flex gap-2">
                    <span className="text-teal-600">—</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                <Stat label="Budget" value={`₹${recommendation.estimated_budget_inr_cr} Cr`} />
                <Stat
                  label="Beneficiaries"
                  value={recommendation.expected_beneficiaries.toLocaleString("en-IN")}
                />
                <Stat label="Timeline" value={`${recommendation.estimated_timeline_months} mo`} />
                <Stat
                  label="Confidence"
                  value={`${(recommendation.confidence * 100).toFixed(0)}%`}
                />
              </div>
              <p className="text-xs text-ink-muted">
                Scheme: <span className="text-ink">{recommendation.relevant_scheme}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-data text-sm text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
    </div>
  );
}
