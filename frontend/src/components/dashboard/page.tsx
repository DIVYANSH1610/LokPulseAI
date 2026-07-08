// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { api, ClusterSummary, Hotspot, Weights, DEFAULT_WEIGHTS, ConstituencyRollup } from "@/lib/api";
import { PriorityCard } from "@/components/PriorityCard";
import { WeightSliders } from "@/components/WeightSliders";
import { Heatmap } from "@/components/Heatmap";
import { useSetAssistantContext } from "@/lib/assistant-context";
import { MainDashboardShell } from "@/components/layout/MainDashboardShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const CONSTITUENCY = "Lucknow";

export default function DashboardPage() {
  useSetAssistantContext({ constituency: CONSTITUENCY });

  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [allClusters, setAllClusters] = useState<ClusterSummary[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [rollup, setRollup] = useState<ConstituencyRollup | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wide, hm, rollups] = await Promise.all([
        api.topPriorities(CONSTITUENCY, 25),
        api.heatmap(CONSTITUENCY),
        api.listConstituencies(),
      ]);
      setAllClusters(wide);
      setClusters(wide.slice(0, 8));
      setHotspots(hm);
      setRollup(rollups.find((r) => r.constituency === CONSTITUENCY) ?? null);
    } catch {
      setError(
        "Could not reach the LokPulse backend. Make sure it's running at " +
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") +
          " and seeded with `python seed.py`."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefault();
  }, [loadDefault]);

  async function handleWeightsChange(newWeights: Weights) {
    setWeights(newWeights);
    try {
      const reranked = await api.rescore(CONSTITUENCY, newWeights);
      setClusters(reranked.slice(0, 8));
    } catch {
      // keep prior ranking on transient failure; slider still reflects intent
    }
  }

  function resetWeights() {
    setWeights(DEFAULT_WEIGHTS);
    loadDefault();
  }

  const pending = rollup ? Math.max(rollup.total_clusters - rollup.actioned_count - rollup.resolved_count, 0) : 0;

  const categoryBreakdown = (() => {
    const totals = new Map<string, number>();
    for (const c of allClusters) {
      totals.set(c.category, (totals.get(c.category) ?? 0) + c.unique_reporter_count);
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, pct: Math.round((count / sum) * 100) }));
  })();

  const topCategory = categoryBreakdown[0];

  return (
    <ProtectedRoute allowedRoles={["mp_office", "mla_office", "district_admin", "panchayat_officer"]}>
      <MainDashboardShell>
        
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Constituency: {CONSTITUENCY}
            </p>
          </div>
          {loading && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full animate-pulse">Syncing Data...</span>}
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={CheckCircle2} label="Total Complaints" value={rollup?.total_reports ?? 0} chip="bg-teal-100" iconColor="text-teal-700" />
          <StatCard icon={ShieldCheck} label="Verified Issues" value={rollup?.total_clusters ?? 0} chip="bg-blue-100" iconColor="text-blue-700" />
          <StatCard icon={Sparkles} label="Resolved Issues" value={rollup?.resolved_count ?? 0} chip="bg-purple-100" iconColor="text-purple-700" />
          <StatCard icon={Clock} label="Pending Issues" value={pending} chip="bg-amber-100" iconColor="text-amber-700" />
        </div>

        {/* Category / Heatmap / Priority preview row */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-6">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Top Issue Categories</h2>
            <div className="space-y-5">
              {categoryBreakdown.map((c) => (
                <div key={c.category} className="group">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700">{c.category}</span>
                    <span className="font-bold text-slate-900">{c.count} <span className="text-slate-400 font-medium">({c.pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${c.pct}%`, background: "var(--gradient-primary)" }}
                    >
                      <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" />
                    </div>
                  </div>
                </div>
              ))}
              {categoryBreakdown.length === 0 && (
                <p className="text-sm text-slate-500 font-medium">No data yet — run the seed script.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-6">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Issue Heatmap</h2>
            <Heatmap hotspots={hotspots} />
          </div>

          <div className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-6">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Immediate Action Required</h2>
            <div className="space-y-3">
              {clusters.slice(0, 3).map((c, i) => (
                <div key={c.cluster_id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {c.one_line_summary || c.category}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{c.unique_reporter_count} reports verified</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      i === 0 ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-orange-100 text-orange-700 border border-orange-200"
                    }`}
                  >
                    {i === 0 ? "Critical" : "High"}
                  </span>
                </div>
              ))}
              {clusters.length === 0 && (
                <p className="text-sm text-slate-500 font-medium">No issues ranked yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="mb-8 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 sm:p-8 shadow-lg shadow-blue-900/10" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <Sparkles size={24} className="text-teal-300" />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-300">LokPulse AI Analysis</p>
            <p className="text-base font-medium leading-relaxed text-white">
              {topCategory
                ? `${topCategory.category} issues are the most reported problem this quarter, accounting for ${topCategory.pct}% of weighted citizen demand. Review the top-ranked recommendation below for the specific ward and evidence.`
                : "Once submissions are seeded, this summary reflects the actual top-weighted category and ward for this constituency."}
            </p>
          </div>
        </div>

        {/* Full priority list + weight sliders */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-6 sm:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-display text-2xl font-bold text-slate-900">Ranked Priority Queue</h2>
            </div>
            <div className="space-y-4">
              {clusters.map((c, i) => (
                <PriorityCard key={c.cluster_id} cluster={c} rank={c.rank ?? i + 1} />
              ))}
              {!loading && clusters.length === 0 && !error && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                  No issue clusters yet for {CONSTITUENCY}. Run the seed script to populate demo data.
                </div>
              )}
            </div>
          </section>

          <aside>
            <div className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-6 sm:p-8 sticky top-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Weight Sliders</h2>
                <button onClick={resetWeights} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">
                  Reset
                </button>
              </div>
              <p className="mb-8 text-sm font-medium text-slate-500 leading-relaxed">
                Drag to see the ranking recompute live. This formula calculates the priority score for every issue.
              </p>
              <WeightSliders weights={weights} onChange={handleWeightsChange} />
            </div>
          </aside>
        </div>

      </MainDashboardShell>
    </ProtectedRoute>
  );
}

function StatCard({
  icon: Icon, label, value, chip, iconColor,
}: {
  icon: typeof CheckCircle2; label: string; value: number; chip: string; iconColor: string;
}) {
  return (
    <div className="rounded-[24px] bg-white border border-slate-200/60 shadow-sm p-6 transition-all hover:shadow-md">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${chip}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <p className="font-display text-4xl font-extrabold text-slate-900">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}