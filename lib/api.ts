/**
 * When NEXT_PUBLIC_API_URL is set, all calls go to the real FastAPI
 * backend. Otherwise the in-memory mock backend (lib/mock-backend.ts)
 * serves identical data shapes — including live weight re-scoring.
 */
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

const networkApi = {
  listConstituencies: () => request<ConstituencyRollup[]>("/district/constituencies"),

  implementationTracker: (constituency?: string) =>
    request<(ClusterSummary & { recommendation: Recommendation })[]>(
      `/district/implementation-tracker${constituency ? `?constituency=${encodeURIComponent(constituency)}` : ""}`
    ),

  updateClusterStatus: (clusterId: string, status: string) =>
    request<ClusterSummary>(`/clusters/${clusterId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  panchayatWardDetail: (wardId: string) =>
    request<{ ward: WardDetail; clusters: ClusterSummary[] }>(`/panchayat/ward/${wardId}`),

  annotateCluster: (clusterId: string, note: string, officerName: string) =>
    request<{ cluster_id: string; annotations: { note: string; officer_name: string; timestamp: string }[] }>(
      `/clusters/${clusterId}/annotate`,
      { method: "POST", body: JSON.stringify({ note, officer_name: officerName }) }
    ),

  createSubmission: (payload: {
    citizen_phone_hash: string;
    channel: "voice" | "text" | "photo" | "whatsapp" | "sms";
    raw_text?: string;
    image_url?: string;
    lat?: number;
    lng?: number;
    ward_id?: string;
  }) =>
    request<{
      submission_id: string;
      cluster_id: string;
      is_new_cluster: boolean;
      category: string;
      one_line_summary: string;
    }>("/submissions", { method: "POST", body: JSON.stringify(payload) }),

  checkUpvoteMatch: (payload: { category: string; ward_id: string; draft_summary: string }) =>
    request<{
      match_found: boolean;
      cluster_id?: string;
      unique_reporter_count?: number;
      one_line_summary?: string;
    }>("/upvotes/check", { method: "POST", body: JSON.stringify(payload) }),

  applyUpvote: (payload: { cluster_id: string; citizen_phone_hash: string }) =>
    request<{ cluster_id: string; unique_reporter_count: number }>("/upvotes/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  topPriorities: (constituency: string, limit = 5) =>
    request<ClusterSummary[]>(
      `/dashboard/top-priorities?constituency=${encodeURIComponent(constituency)}&limit=${limit}`
    ),

  heatmap: (constituency: string) =>
    request<Hotspot[]>(`/dashboard/heatmap?constituency=${encodeURIComponent(constituency)}`),

  rescore: (constituency: string, weights: Weights) =>
    request<ClusterSummary[]>(
      `/dashboard/rescore?constituency=${encodeURIComponent(constituency)}`,
      { method: "POST", body: JSON.stringify(weights) }
    ),

  clusterDetail: (clusterId: string) =>
    request<ClusterSummary & { recommendation: Recommendation | null }>(
      `/clusters/${clusterId}`
    ),

  regenerateRecommendation: (clusterId: string) =>
    request<{ cluster_id: string; recommendation: Recommendation }>(
      `/clusters/${clusterId}/recommendation`,
      { method: "POST" }
    ),

  nearbyIssues: (wardId: string) =>
    request<ClusterSummary[]>(`/issue-clusters/nearby?ward_id=${encodeURIComponent(wardId)}`),

  submissionStatus: (citizenPhoneHash: string) =>
    request<
      { submission_id: string; category: string; summary: string; status: string; timestamp: string }[]
    >(`/submissions/status?citizen_phone_hash=${encodeURIComponent(citizenPhoneHash)}`),
};

import { mockApi } from "./mock-backend";

export const api: typeof networkApi = USE_MOCK ? (mockApi as typeof networkApi) : networkApi;
