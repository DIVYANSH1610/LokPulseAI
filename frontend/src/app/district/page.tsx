"use client";

import { BrandMark } from "@/components/icons";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ConstituencyRollup, ClusterSummary, Recommendation } from "@/lib/api";
import { useSetAssistantContext } from "@/lib/assistant-context";

const STATUS_OPTIONS = ["new", "under_review", "recommended", "actioned", "resolved"];

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  under_review: "Under review",
  recommended: "Recommended",
  actioned: "Actioned",
  resolved: "Resolved",
};

type TrackerItem = ClusterSummary & { recommendation: Recommendation };

export default function DistrictPage() {
  const [constituencies, setConstituencies] = useState<ConstituencyRollup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tracker, setTracker] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSetAssistantContext({ constituency: selected ?? undefined });

  useEffect(() => {
    api
      .listConstituencies()
      .then((rows) => {
        setConstituencies(rows);
        if (rows.length > 0) setSelected(rows[0].constituency);
      })
      .catch(() => setError("Could not reach the backend."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.implementationTracker(selected).then(setTracker).catch(() => setTracker([]));
  }, [selected]);

  async function handleStatusChange(clusterId: string, status: string) {
    const updated = await api.updateClusterStatus(clusterId, status);
    setTracker((prev) =>
      prev.map((item) => (item.cluster_id === clusterId ? { ...item, status: updated.status } : item))
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-navy-900">
            Cross-Constituency Implementation Tracker
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every recommendation, linked to sanctioned works, with a status you can update.
          </p>
        </header>

        {error && (
          <div className="card mb-6 border-[#c9483c] bg-[#fdf2f0] p-4 text-sm text-[#c9483c]">
            {error}
          </div>
        )}

        {/* Constituency rollup cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {constituencies.map((c) => (
            <button
              key={c.constituency}
              onClick={() => setSelected(c.constituency)}
              className={`card p-4 text-left transition ${
                selected === c.constituency ? "border-teal-600" : ""
              }`}
            >
              <div className="font-medium text-ink">{c.constituency}</div>
              <div className="mt-2 flex gap-4 text-xs text-ink-muted">
                <span>
                  <span className="font-data text-ink">{c.ward_count}</span> wards
                </span>
                <span>
                  <span className="font-data text-ink">{c.total_clusters}</span> issues
                </span>
                <span>
                  <span className="font-data text-ink">{c.total_reports}</span> reports
                </span>
              </div>
              <div className="mt-1 text-xs text-teal-600">
                {c.actioned_count} actioned · {c.resolved_count} resolved
              </div>
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-ink-muted">Loading…</p>}

        {/* Implementation tracker table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Ward</th>
                <th className="px-4 py-3">Scheme</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tracker.map((item) => (
                <tr key={item.cluster_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{item.category}</div>
                    <div className="text-xs text-ink-muted">{item.one_line_summary}</div>
                  </td>
                  <td className="px-4 py-3 font-data text-xs text-ink-muted">
                    {item.ward_id}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {item.recommendation?.relevant_scheme ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-data text-xs text-ink">
                    ₹{item.recommendation?.estimated_budget_inr_cr ?? 0} Cr
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.cluster_id, e.target.value)}
                      className="rounded-md border border-border bg-white px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && tracker.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">
                    No recommendations generated yet for this constituency.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <div className="border-b border-border bg-navy-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </Link>
        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
          District Administration
        </span>
      </div>
    </div>
  );
}