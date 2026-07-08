// frontend/src/lib/api.ts

export interface ClusterSummary {
  cluster_id: string;
  category: string;
  ward_id: string;
  unique_reporter_count: number;
  status: string;
  one_line_summary: string;
  priority_score?: number;
  rank?: number;
  centroid?: { lat: number; lng: number };
  channel_breakdown?: Record<string, number>;
  first_reported?: string;
  last_reported?: string;
  score_breakdown?: any;
}

export interface Hotspot {
  lat: number;
  lng: number;
  weight: number;
}

export interface ConstituencyRollup {
  constituency: string;
  total_reports: number;
  total_clusters: number;
  actioned_count: number;
  resolved_count: number;
  ward_count?: number;
}

export interface Weights {
  unique_reporter_count: number;
  ward_population: number;
  distance_to_facility_km: number;
  infrastructure_gap_index: number;
  years_since_last_dev_spend: number;
  emergency_multiplier: number;
  sc_st_percentage: number;
  estimated_cost_inr: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  unique_reporter_count: 0.20,
  ward_population: 0.20,
  distance_to_facility_km: 0.15,
  infrastructure_gap_index: 0.15,
  years_since_last_dev_spend: 0.10,
  emergency_multiplier: 0.10,
  sc_st_percentage: 0.05,
  estimated_cost_inr: -0.05,
};

// Use the environment variable for Vercel, fallback to localhost for local dev
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// A generic fetch wrapper for your endpoints
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error("API error fetching " + endpoint);
  return res.json();
}

export const api = {
  // --- Citizen Endpoints ---
  submitMultimodal: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/submissions`, { method: "POST", body: formData });
    return res.json();
  },
  submitReport: async (payload: any) => fetchAPI("/submissions", { method: "POST", body: JSON.stringify(payload) }),
  nearbyIssues: async (wardId: string): Promise<ClusterSummary[]> => fetchAPI(`/issue-clusters/nearby?ward_id=${wardId}`),
  applyUpvote: async (payload: { cluster_id: string; citizen_phone_hash: string }) => fetchAPI("/upvotes/apply", { method: "POST", body: JSON.stringify(payload) }),
  checkUpvoteMatch: async (payload: any) => fetchAPI("/upvotes/check", { method: "POST", body: JSON.stringify(payload) }),
  mySubmissionsStatus: async (citizenPhoneHash: string) => fetchAPI(`/submissions/status?citizen_phone_hash=${citizenPhoneHash}`),

  // --- Dashboard / Admin Endpoints ---
  topPriorities: async (constituency: string, limit = 5): Promise<ClusterSummary[]> => fetchAPI(`/dashboard/top-priorities?constituency=${constituency}&limit=${limit}`),
  heatmap: async (constituency: string): Promise<Hotspot[]> => fetchAPI(`/dashboard/heatmap?constituency=${constituency}`),
  listConstituencies: async (): Promise<ConstituencyRollup[]> => fetchAPI(`/district/constituencies`),
  rescore: async (constituency: string, weights: Weights): Promise<ClusterSummary[]> => fetchAPI(`/dashboard/rescore?constituency=${constituency}`, { method: "POST", body: JSON.stringify(weights) }),
  getClusterDetail: async (clusterId: string) => fetchAPI(`/clusters/${clusterId}`),
  generateRecommendation: async (clusterId: string) => fetchAPI(`/clusters/${clusterId}/recommendation`, { method: "POST" }),
  
  // --- District / Panchayat Endpoints ---
  implementationTracker: async (constituency?: string) => fetchAPI(constituency ? `/district/implementation-tracker?constituency=${constituency}` : `/district/implementation-tracker`),
  updateClusterStatus: async (clusterId: string, status: string) => fetchAPI(`/clusters/${clusterId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  panchayatWardDetail: async (wardId: string) => fetchAPI(`/panchayat/ward/${wardId}`),
  annotateCluster: async (clusterId: string, payload: any) => fetchAPI(`/clusters/${clusterId}/annotate`, { method: "POST", body: JSON.stringify(payload) }),

  // --- Global ---
  askAI: async (payload: any) => fetchAPI("/assistant/ask", { method: "POST", body: JSON.stringify(payload) }),
};