"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ClusterSummary } from "@/lib/api";
import { getCitizenId } from "@/lib/citizen";
import { LUCKNOW_WARDS } from "@/lib/wards";

export default function BrowsePage() {
  const [wardId, setWardId] = useState(LUCKNOW_WARDS[0].id);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [upvoted, setUpvoted] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  async function load(ward: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.nearbyIssues(ward);
      setClusters(res);
    } catch {
      setError("Could not load issues for this ward.");
    } finally {
      setLoading(false);
    }
  }

  async function upvote(clusterId: string) {
    try {
      const res = await api.applyUpvote({ cluster_id: clusterId, citizen_phone_hash: getCitizenId() });
      setUpvoted((prev) => ({ ...prev, [clusterId]: res.unique_reporter_count }));
    } catch {
      setError("Could not record your upvote. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <TopBar />
      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="font-display text-2xl text-[var(--navy-900)]">Browse nearby issues</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--ink-muted)]">
          Already reported? Add your voice instead of filing a duplicate.
        </p>

        <div className="mb-4 flex gap-2">
          <select
            value={wardId}
            onChange={(e) => setWardId(e.target.value)}
            className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {LUCKNOW_WARDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(wardId)}
            className="rounded-md bg-[var(--navy-900)] px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </div>

        {error && (
          <div className="card mb-4 border-[#c9483c] bg-[#fdf2f0] p-3 text-sm text-[#c9483c]">
            {error}
          </div>
        )}
        {loading && <p className="text-sm text-[var(--ink-muted)]">Loading…</p>}

        <div className="space-y-3">
          {clusters.map((c) => {
            const count = upvoted[c.cluster_id] ?? c.unique_reporter_count;
            const didUpvote = c.cluster_id in upvoted;
            return (
              <div key={c.cluster_id} className="card flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-medium text-[var(--ink)]">{c.category}</div>
                  <p className="text-sm text-[var(--ink-muted)]">{c.one_line_summary}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {count} {count === 1 ? "person has" : "people have"} reported this
                  </p>
                </div>
                <button
                  onClick={() => upvote(c.cluster_id)}
                  disabled={didUpvote}
                  className="shrink-0 rounded-md border border-[var(--teal-600)] px-3 py-1.5 text-xs font-medium text-[var(--teal-600)] disabled:opacity-50"
                >
                  {didUpvote ? "Upvoted ✓" : "Upvote"}
                </button>
              </div>
            );
          })}
          {!loading && clusters.length === 0 && (
            <div className="card p-6 text-center text-sm text-[var(--ink-muted)]">
              No issues found for this ward yet. Select a ward and press Search.
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/submit" className="text-sm text-[var(--teal-600)] hover:underline">
            Don't see your issue? Report a new one →
          </Link>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--navy-900)]">
      <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🏛️</span>
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </Link>
        <span className="rounded-full bg-[var(--teal-600)] px-3 py-1 text-xs font-medium text-white">
          Citizen
        </span>
      </div>
    </div>
  );
}
