"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Map as MapIcon,
  BarChart3,
  FileText,
  Landmark,
  Mail,
  Settings,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { api, ClusterSummary, Hotspot, Weights, DEFAULT_WEIGHTS, ConstituencyRollup } from "@/lib/api";
import { PriorityCard } from "@/components/PriorityCard";
import { WeightSliders } from "@/components/WeightSliders";
import { Heatmap } from "@/components/Heatmap";
import { useSetAssistantContext } from "@/lib/assistant-context";

const CONSTITUENCY = "Lucknow";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Complaints", icon: MessageSquareWarning, href: "/dashboard", active: false },
  { label: "Map View", icon: MapIcon, href: "/dashboard", active: false },
  { label: "Analytics", icon: BarChart3, href: "/dashboard", active: false },
  { label: "Reports", icon: FileText, href: "/dashboard", active: false },
  { label: "Schemes", icon: Landmark, href: "/dashboard", active: false },
  { label: "Messages", icon: Mail, href: "/dashboard", active: false },
  { label: "Settings", icon: Settings, href: "/dashboard", active: false },
];

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
    <div className="flex min-h-screen bg-[var(--paper)]">
      <Sidebar />

      <div className="flex-1">
        <TopBar />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl text-[var(--ink)]">Dashboard Overview</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--ink-muted)]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--teal-600)" }} />
                Constituency: {CONSTITUENCY}
              </p>
            </div>
            {loading && <span className="text-xs text-[var(--ink-muted)]">Loading…</span>}
          </header>

          {error && (
            <div className="card mb-6 border-[var(--red-500)] bg-[var(--red-100)] p-4 text-sm text-[#991b1b]">
              {error}
            </div>
          )}

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={CheckCircle2}
              label="Total Complaints"
              value={rollup?.total_reports ?? 0}
              chip="var(--teal-100)"
              iconColor="#047857"
            />
            <StatCard
              icon={ShieldCheck}
              label="Verified Issues"
              value={rollup?.total_clusters ?? 0}
              chip="var(--blue-100)"
              iconColor="#2563eb"
            />
            <StatCard
              icon={Sparkles}
              label="Resolved Issues"
              value={rollup?.resolved_count ?? 0}
              chip="var(--purple-100)"
              iconColor="#7c3aed"
            />
            <StatCard
              icon={Clock}
              label="Pending Issues"
              value={pending}
              chip="var(--amber-100)"
              iconColor="#b45309"
            />
          </div>

          {/* Category / Heatmap / Priority preview row */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Top Issue Categories</h2>
              <div className="space-y-4">
                {categoryBreakdown.map((c) => (
                  <div key={c.category}>
                    <div className="mb-1 flex items-center justify-between text-xs text-[var(--ink-muted)]">
                      <span>{c.category}</span>
                      <span>
                        {c.count} ({c.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${c.pct}%`, background: "var(--gradient-primary)" }}
                      />
                    </div>
                  </div>
                ))}
                {categoryBreakdown.length === 0 && (
                  <p className="text-xs text-[var(--ink-muted)]">No data yet — run the seed script.</p>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Issue Heatmap</h2>
              <Heatmap hotspots={hotspots} />
            </div>

            <div className="card p-5">
              <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">Top Priority Issues</h2>
              <div className="space-y-3">
                {clusters.slice(0, 3).map((c, i) => (
                  <div key={c.cluster_id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">
                        {c.one_line_summary || c.category}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">{c.unique_reporter_count} reports</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={
                        i === 0
                          ? { background: "var(--red-100)", color: "#991b1b" }
                          : { background: "var(--amber-100)", color: "#b45309" }
                      }
                    >
                      {i === 0 ? "High" : "Medium"}
                    </span>
                  </div>
                ))}
                {clusters.length === 0 && (
                  <p className="text-xs text-[var(--ink-muted)]">No issues ranked yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="mb-8 card flex items-start gap-4 p-5" style={{ background: "var(--gradient-primary)" }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/80">AI Summary</p>
              <p className="text-sm leading-relaxed text-white">
                {topCategory
                  ? `${topCategory.category} issues are the most reported problem this quarter, accounting for ${topCategory.pct}% of weighted citizen demand. Review the top-ranked recommendation below for the specific ward and evidence.`
                  : "Once submissions are seeded, this summary reflects the actual top-weighted category and ward for this constituency."}
              </p>
            </div>
          </div>

          {/* Full priority list + weight sliders (existing functionality, preserved) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg text-[var(--ink)]">Top Urgent Issues</h2>
              </div>
              <div className="space-y-3">
                {clusters.map((c, i) => (
                  <PriorityCard key={c.cluster_id} cluster={c} rank={c.rank ?? i + 1} />
                ))}
                {!loading && clusters.length === 0 && !error && (
                  <div className="card p-6 text-center text-sm text-[var(--ink-muted)]">
                    No issue clusters yet for {CONSTITUENCY}. Run the seed script to populate demo data.
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--ink)]">Priority Weight Sliders</h2>
                  <button onClick={resetWeights} className="text-xs text-[var(--navy-900)] hover:underline">
                    Reset
                  </button>
                </div>
                <p className="mb-3 text-xs text-[var(--ink-muted)]">
                  Drag to see the ranking recompute live — this is the same formula behind every score on
                  the left.
                </p>
                <WeightSliders weights={weights} onChange={handleWeightsChange} />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-white px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          🏛️
        </span>
        <span className="font-display text-base text-[var(--ink)]">LokPulse AI</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
            style={
              item.active
                ? { background: "var(--purple-100)", color: "var(--navy-900)" }
                : { color: "var(--ink-muted)" }
            }
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--purple-100)] text-sm">
          👤
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--ink)]">Admin User</p>
          <p className="truncate text-[10px] text-[var(--ink-muted)]">MP Office</p>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="border-b border-[var(--border)] bg-white">
      <div className="flex items-center justify-end gap-4 px-6 py-4">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]">
          <Bell size={15} className="text-[var(--ink-muted)]" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--red-500)]" />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  chip,
  iconColor,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  chip: string;
  iconColor: string;
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: chip }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <p className="font-data text-2xl text-[var(--ink)]">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{label}</p>
    </div>
  );
}