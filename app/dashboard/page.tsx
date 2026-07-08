"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ClusterSummary, Hotspot, Weights, DEFAULT_WEIGHTS } from "@/lib/api";
import { PriorityCard } from "@/components/PriorityCard";
import { WeightSliders } from "@/components/WeightSliders";
import { Heatmap } from "@/components/Heatmap";
import { BrandMark } from "@/components/icons";
import { Flame, MapPin } from "lucide-react";

const CONSTITUENCY = "Lucknow";

export default function DashboardPage() {
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [top, hm] = await Promise.all([
        api.topPriorities(CONSTITUENCY, 8),
        api.heatmap(CONSTITUENCY),
      ]);
      setClusters(top);
      setHotspots(hm);
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

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-navy-900">
            {CONSTITUENCY} Constituency — Development Intelligence
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every ranking below is generated from citizen reports, ward data, and a scoring
            formula you can see and adjust — not a black box.
          </p>
        </header>

        {error && (
          <div className="card mb-6 border-[#c9483c] bg-[#fdf2f0] p-4 text-sm text-[#c9483c]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg text-ink">
                <Flame className="size-4.5 text-amber-500" aria-hidden="true" />
                Top Urgent Issues
              </h2>
              {loading && <span className="text-xs text-ink-muted">Loading…</span>}
            </div>
            <div className="space-y-3">
              {clusters.map((c, i) => (
                <PriorityCard key={c.cluster_id} cluster={c} rank={c.rank ?? i + 1} />
              ))}
              {!loading && clusters.length === 0 && !error && (
                <div className="card p-6 text-center text-sm text-ink-muted">
                  No issue clusters yet for {CONSTITUENCY}. Run the seed script to populate demo
                  data.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 font-display text-base text-ink">
                <MapPin className="size-4 text-teal-600" aria-hidden="true" />
                Live Heatmap
              </h2>
              <Heatmap hotspots={hotspots} />
            </div>

            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base text-ink">
                  Priority Weight Sliders
                </h2>
                <button
                  onClick={resetWeights}
                  className="text-xs text-teal-600 hover:underline"
                >
                  Reset
                </button>
              </div>
              <p className="mb-3 text-xs text-ink-muted">
                Drag to see the ranking recompute live — this is the same formula behind every
                score on the left.
              </p>
              <WeightSliders weights={weights} onChange={handleWeightsChange} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <div className="border-b border-border bg-navy-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </div>
        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
          MP Office View
        </span>
      </div>
    </div>
  );
}
