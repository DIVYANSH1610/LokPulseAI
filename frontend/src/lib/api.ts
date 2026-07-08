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
  // Keep the multimodal function that TypeScript found
  submitMultimodal: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },
  
  // All the missing routes your pages are looking for
  submitReport: async (payload: any) => fetchAPI("/submissions", { method: "POST", body: JSON.stringify(payload) }),
  nearbyIssues: async (wardId: string): Promise<ClusterSummary[]> => fetchAPI(`/issue-clusters/nearby?ward_id=${wardId}`),
  topPriorities: async (constituency: string, limit = 5): Promise<ClusterSummary[]> => fetchAPI(`/dashboard/top-priorities?constituency=${constituency}&limit=${limit}`),
  heatmap: async (constituency: string): Promise<Hotspot[]> => fetchAPI(`/dashboard/heatmap?constituency=${constituency}`),
  listConstituencies: async (): Promise<ConstituencyRollup[]> => fetchAPI(`/district/constituencies`),
  rescore: async (constituency: string, weights: Weights): Promise<ClusterSummary[]> => fetchAPI(`/dashboard/rescore?constituency=${constituency}`, { method: "POST", body: JSON.stringify(weights) }),
  askAI: async (payload: any) => fetchAPI("/assistant/ask", { method: "POST", body: JSON.stringify(payload) }),
};