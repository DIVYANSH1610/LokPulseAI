const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const USE_MOCK = !API_BASE;

export type ScoreBreakdown = {
  normalized_components: Record<string, number>;
  weighted_contributions: Record<string, number>;
  weights_used: Record<string, number>;
};

export type ClusterSummary = {
  cluster_id: string;
  category: string;
  ward_id: string;
  unique_reporter_count: number;
  channel_breakdown: Record<string, number>;
  status: string;
  one_line_summary: string;
  centroid: { lat: number | null; lng: number | null };
  first_reported: string | null;
  last_reported: string | null;
  priority_score?: number;
  score_breakdown?: ScoreBreakdown;
  rank?: number;
};

export type Recommendation = {
  recommended_action: string;
  reasoning: string[];
  estimated_budget_inr_cr: number;
  expected_beneficiaries: number;
  relevant_scheme: string;
  priority_rank: number;
  estimated_timeline_months: number;
  confidence: number;
  mp_decision: string;
};

export type Hotspot = {
  lat: number;
  lng: number;
  weight: number;
  cluster_count: number;
  dominant_category: string;
  cluster_ids: string[];
};

export type Weights = {
  unique_reporter_count: number;
  ward_population: number;
  distance_to_facility_km: number;
  infrastructure_gap_index: number;
  years_since_last_dev_spend: number;
  emergency_multiplier: number;
  sc_st_percentage: number;
  estimated_cost_inr: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  unique_reporter_count: 0.2,
  ward_population: 0.2,
  distance_to_facility_km: 0.15,
  infrastructure_gap_index: 0.15,
  years_since_last_dev_spend: 0.1,
  emergency_multiplier: 0.1,
  sc_st_percentage: 0.05,
  estimated_cost_inr: -0.05,
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export type ConstituencyRollup = {
  constituency: string;
  ward_count: number;
  total_clusters: number;
  total_reports: number;
  actioned_count: number;
  resolved_count: number;
};

export type WardDetail = {
  ward_id: string;
  ward_name: string;
  constituency: string;
  population: number;
  literacy_rate: number;
  nearest_phc_km: number;
  nearest_school_km: number;
  flood_prone: boolean;
};

export type AskAIRole = "citizen" | "mp_office" | "mla_office" | "district_admin" | "panchayat_officer";

export type AskAIResponse = {
  answer: string;
  suggested_actions: string[];
  used_live_data: boolean;
};

export type MultimodalSubmissionResponse = {
  submission_id: string;
  cluster_id: string;
  is_new_cluster: boolean;
  category: string;
  one_line_summary: string;
  transcribed_text: string;
  translated_text: string;
  formatted_report: string;
  image_url?: string;
};

const networkApi = {
  // ... your other methods (keep them) ...

  submitMultimodal: (formData: FormData) =>
    fetch(`${API_BASE}/submissions/multimodal`, {
      method: "POST",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed: ${res.status} ${text}`);
      }
      return res.json() as Promise<MultimodalSubmissionResponse>;
    }),

  // ... rest of your methods ...
};

import { mockApi } from "./mock-backend";

export const api: typeof networkApi = USE_MOCK ? (mockApi as typeof networkApi) : networkApi;

// ====================== CITIZEN HELPER ======================
export function getCitizenId(): string {
  if (typeof window === "undefined") return "demo-citizen";
  let hash = localStorage.getItem("citizen_phone_hash");
  if (!hash) {
    hash = "citizen_" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("citizen_phone_hash", hash);
  }
  return hash;
}