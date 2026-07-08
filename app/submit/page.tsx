"use client";

import { BrandMark } from "@/components/icons";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getCitizenId } from "@/lib/citizen";
import { LUCKNOW_WARDS, CATEGORIES } from "@/lib/wards";

type Step = "form" | "checking" | "match_found" | "submitting" | "done";

export default function SubmitPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [wardId, setWardId] = useState(LUCKNOW_WARDS[0].id);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [match, setMatch] = useState<{
    cluster_id?: string;
    unique_reporter_count?: number;
    one_line_summary?: string;
  } | null>(null);
  const [result, setResult] = useState<{ category: string; one_line_summary: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setStep("checking");
    try {
      const res = await api.checkUpvoteMatch({
        category,
        ward_id: wardId,
        draft_summary: text,
      });
      if (res.match_found) {
        setMatch(res);
        setStep("match_found");
      } else {
        await doSubmit();
      }
    } catch {
      setError("Could not reach the server to check for similar reports. You can still submit.");
      await doSubmit();
    }
  }

  async function handleUpvoteInstead() {
    if (!match?.cluster_id) return;
    setStep("submitting");
    try {
      await api.applyUpvote({ cluster_id: match.cluster_id, citizen_phone_hash: getCitizenId() });
      setStep("done");
    } catch {
      setError("Could not record your upvote. Please try again.");
      setStep("match_found");
    }
  }

  async function doSubmit() {
    setStep("submitting");
    try {
      const res = await api.createSubmission({
        citizen_phone_hash: getCitizenId(),
        channel: imageUrl ? "photo" : "text",
        raw_text: text,
        image_url: imageUrl || undefined,
        ward_id: wardId,
      });
      setResult({ category: res.category, one_line_summary: res.one_line_summary });
      setStep("done");
    } catch {
      setError("Could not submit your report. Please check your connection and try again.");
      setStep("form");
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="font-display text-2xl text-navy-900">Report an issue</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">
          Tell us what's wrong — we'll match it against nearby reports and route it to the right
          office.
        </p>

        {error && (
          <div className="card mb-4 border-[#c9483c] bg-[#fdf2f0] p-3 text-sm text-[#c9483c]">
            {error}
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleReview} className="card space-y-4 p-5">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ward">
              <select
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
            </Field>

            <Field label="Describe the issue">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="e.g. Deep pothole near the market crossing, causing accidents"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                required
              />
            </Field>

            <Field label="Photo URL (optional)">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              />
            </Field>

            <button
              type="submit"
              className="w-full rounded-md bg-navy-900 py-2.5 text-sm font-medium text-white hover:bg-navy-700"
            >
              Continue
            </button>
          </form>
        )}

        {step === "checking" && (
          <div className="card p-5 text-sm text-ink-muted">
            Checking for similar reports nearby…
          </div>
        )}

        {step === "match_found" && match && (
          <div className="card space-y-4 p-5">
            <div className="rounded-md bg-amber-100 p-3 text-sm text-ink">
              <strong>{match.unique_reporter_count}</strong> people nearby already reported
              something similar: <em>"{match.one_line_summary}"</em>
            </div>
            <p className="text-sm text-ink-muted">
              Adding your voice to it helps it get prioritized faster. Only submit a new report if
              yours is genuinely a different issue.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpvoteInstead}
                className="flex-1 rounded-md bg-teal-600 py-2.5 text-sm font-medium text-white"
              >
                Upvote instead
              </button>
              <button
                onClick={doSubmit}
                className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-ink"
              >
                Submit as new
              </button>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <div className="card p-5 text-sm text-ink-muted">Submitting…</div>
        )}

        {step === "done" && (
          <div className="card space-y-3 p-5">
            <div className="flex size-9 items-center justify-center rounded-full bg-teal-100">
              <CircleCheck className="size-5 text-teal-600" aria-hidden="true" />
            </div>
            <p className="font-medium text-ink">
              {result ? "Your report was submitted." : "Your upvote was recorded."}
            </p>
            {result && (
              <p className="text-sm text-ink-muted">
                Classified as <strong>{result.category}</strong>: {result.one_line_summary}
              </p>
            )}
            <div className="flex gap-3 pt-2 text-sm">
              <Link href="/status" className="text-teal-600 hover:underline">
                Track my reports
              </Link>
              <button
                onClick={() => {
                  setStep("form");
                  setText("");
                  setImageUrl("");
                  setMatch(null);
                  setResult(null);
                }}
                className="text-teal-600 hover:underline"
              >
                Report another issue
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link href="/browse" className="text-sm text-teal-600 hover:underline">
            Or browse nearby issues to upvote →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
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
