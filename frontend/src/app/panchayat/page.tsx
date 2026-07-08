"use client";

import { BrandMark } from "@/components/icons";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { api, ClusterSummary } from "@/lib/api";
import { LUCKNOW_WARDS } from "@/lib/wards";
import { useSetAssistantContext } from "@/lib/assistant-context";

export default function PanchayatPage() {
  const [wardId, setWardId] = useState(LUCKNOW_WARDS[0].id);
  useSetAssistantContext({ wardId });

  const { data, error, isLoading } = useSWR(["panchayat-ward", wardId], () =>
    api.panchayatWardDetail(wardId)
  );
  const ward = data?.ward ?? null;
  const clusters = data?.clusters ?? [];
  const loading = isLoading;

  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-navy-900">Ward-Level Detail</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Annotate ground-truth corrections. Budget approval is scoped to MP/MLA offices.
          </p>
        </header>

        <div className="mb-6">
          <label htmlFor="ward-select" className="sr-only">
            Select ward
          </label>
          <select
            id="ward-select"
            value={wardId}
            onChange={(e) => setWardId(e.target.value)}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            {LUCKNOW_WARDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="card mb-4 border-[#c9483c] bg-[#fdf2f0] p-3 text-sm text-[#c9483c]">
            Could not load this ward. It may not have any reported issues yet.
          </div>
        )}
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}

        {ward && (
          <div className="card mb-4 p-4">
            <div className="font-display text-lg text-ink">{ward.ward_name}</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Population" value={ward.population.toLocaleString("en-IN")} />
              <Stat label="Literacy" value={`${ward.literacy_rate}%`} />
              <Stat label="Nearest PHC" value={`${ward.nearest_phc_km} km`} />
              <Stat label="Nearest school" value={`${ward.nearest_school_km} km`} />
            </div>
            {ward.flood_prone && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-ink">
                <TriangleAlert className="size-3 text-amber-500" aria-hidden="true" />
                Flood-prone
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {clusters.map((c: any) => (
            <ClusterAnnotationCard key={c.cluster_id} cluster={c} />
          ))}
          {!loading && !error && clusters.length === 0 && (
            <div className="card p-5 text-center text-sm text-ink-muted">
              No reported issues in this ward yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

type Annotation = { note: string; officer_name: string; timestamp: string };

function ClusterAnnotationCard({ cluster }: { cluster: ClusterSummary }) {
  const [note, setNote] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>(
    (cluster.score_breakdown as unknown as { panchayat_annotations?: Annotation[] })
      ?.panchayat_annotations ?? []
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleAnnotate() {
    if (!note.trim() || !officerName.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.annotateCluster(cluster.cluster_id, note, officerName);
      setAnnotations(res.annotations);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-ink">{cluster.category}</div>
          <p className="text-sm text-ink-muted">{cluster.one_line_summary}</p>
        </div>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-600">
          {cluster.unique_reporter_count} reports
        </span>
      </div>

      {annotations.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          {annotations.map((a, i) => (
            <div key={i} className="text-xs text-ink-muted">
              <span className="text-ink">{a.officer_name}:</span> {a.note}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={officerName}
          onChange={(e) => setOfficerName(e.target.value)}
          placeholder="Your name"
          className="rounded-md border border-border bg-white px-3 py-2 text-sm sm:w-40"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Land already allocated for this"
          className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={handleAnnotate}
          disabled={submitting}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add note
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-data text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="border-b border-border bg-navy-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </Link>
        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
          Panchayat Officer
        </span>
      </div>
    </div>
  );
}