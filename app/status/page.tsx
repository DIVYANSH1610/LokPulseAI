"use client";

import { BrandMark } from "@/components/icons";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getCitizenId } from "@/lib/citizen";

type StatusItem = {
  submission_id: string;
  category: string;
  summary: string;
  status: string;
  timestamp: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "Received",
  under_review: "Under review",
  recommended: "Recommended",
  actioned: "Actioned",
  resolved: "Resolved",
  unknown: "Received",
};

const STATUS_COLOR: Record<string, string> = {
  new: "#8fb8ad",
  under_review: "#2c5580",
  recommended: "#1b7a72",
  actioned: "#d98e2b",
  resolved: "#1b7a72",
  unknown: "#8fb8ad",
};

export default function StatusPage() {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .submissionStatus(getCitizenId())
      .then(setItems)
      .catch(() => setError("Could not load your submissions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="font-display text-2xl text-navy-900">My submissions</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">
          Reports and upvotes from this device.
        </p>

        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error && (
          <div className="card border-[#c9483c] bg-[#fdf2f0] p-3 text-sm text-[#c9483c]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.submission_id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{item.category}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: STATUS_COLOR[item.status] ?? "#8fb8ad" }}
                >
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{item.summary}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {new Date(item.timestamp).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
          {!loading && items.length === 0 && !error && (
            <div className="card p-6 text-center text-sm text-ink-muted">
              You haven't submitted anything from this device yet.
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/submit" className="text-sm text-teal-600 hover:underline">
            Report a new issue →
          </Link>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <div className="border-b border-border bg-navy-900">
      <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </Link>
        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
          Citizen
        </span>
      </div>
    </div>
  );
}
