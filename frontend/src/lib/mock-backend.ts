/**
 * In-memory mock of the LokPulse FastAPI backend.
 *
 * Implements the exact same API surface as lib/api.ts, including a
 * faithful TypeScript port of the deterministic priority-scoring
 * formula from backend/agents/priority_ranking_agent.py — so the
 * live weight-slider re-ranking works identically to the real backend.
 *
 * To reconnect the real backend, set NEXT_PUBLIC_API_URL — lib/api.ts
 * automatically switches back to network mode.
 */

import type {
  ClusterSummary,
  ConstituencyRollup,
  Hotspot,
  Recommendation,
  ScoreBreakdown,
  WardDetail,
  Weights,
} from "./api";
import { DEFAULT_WEIGHTS } from "./api";

// ---------------------------------------------------------------------------
// Ward profiles (from data/ward_profiles_seed.csv)
// ---------------------------------------------------------------------------

type WardProfile = WardDetail & {
  sc_st_percentage: number;
  health_index: number;
  air_quality_index: number;
  years_since_last_dev_spend: number;
};

export const WARD_PROFILES: WardProfile[] = [
  { ward_id: "LKO-W01", ward_name: "Aliganj", constituency: "Lucknow", population: 32000, sc_st_percentage: 12.5, nearest_phc_km: 4.2, nearest_school_km: 1.1, literacy_rate: 78.4, health_index: 62.0, flood_prone: false, air_quality_index: 180, years_since_last_dev_spend: 3 },
  { ward_id: "LKO-W02", ward_name: "Chinhat", constituency: "Lucknow", population: 45500, sc_st_percentage: 22.1, nearest_phc_km: 7.8, nearest_school_km: 2.4, literacy_rate: 64.2, health_index: 51.5, flood_prone: true, air_quality_index: 210, years_since_last_dev_spend: 7 },
  { ward_id: "LKO-W03", ward_name: "Gomti Nagar", constituency: "Lucknow", population: 58000, sc_st_percentage: 8.3, nearest_phc_km: 2.1, nearest_school_km: 0.8, literacy_rate: 84.1, health_index: 71.2, flood_prone: false, air_quality_index: 165, years_since_last_dev_spend: 1 },
  { ward_id: "LKO-W04", ward_name: "Malihabad", constituency: "Lucknow", population: 28700, sc_st_percentage: 31.6, nearest_phc_km: 9.4, nearest_school_km: 3.6, literacy_rate: 58.9, health_index: 47.8, flood_prone: true, air_quality_index: 140, years_since_last_dev_spend: 9 },
  { ward_id: "LKO-W05", ward_name: "Mohanlalganj", constituency: "Lucknow", population: 36200, sc_st_percentage: 27.9, nearest_phc_km: 6.5, nearest_school_km: 2.9, literacy_rate: 61.3, health_index: 49.0, flood_prone: false, air_quality_index: 155, years_since_last_dev_spend: 6 },
  { ward_id: "LKO-W06", ward_name: "Alambagh", constituency: "Lucknow", population: 41000, sc_st_percentage: 15.2, nearest_phc_km: 3.3, nearest_school_km: 1.5, literacy_rate: 72.6, health_index: 58.4, flood_prone: false, air_quality_index: 195, years_since_last_dev_spend: 4 },
  { ward_id: "LKO-W07", ward_name: "Bakshi Ka Talab", constituency: "Lucknow", population: 29800, sc_st_percentage: 24.7, nearest_phc_km: 8.9, nearest_school_km: 3.1, literacy_rate: 59.7, health_index: 48.6, flood_prone: true, air_quality_index: 148, years_since_last_dev_spend: 8 },
  { ward_id: "LKO-W08", ward_name: "Sarojini Nagar", constituency: "Lucknow", population: 52300, sc_st_percentage: 18.4, nearest_phc_km: 5.6, nearest_school_km: 1.9, literacy_rate: 69.8, health_index: 55.3, flood_prone: false, air_quality_index: 172, years_since_last_dev_spend: 5 },
  { ward_id: "LKO-W09", ward_name: "Nagram", constituency: "Lucknow", population: 21400, sc_st_percentage: 29.3, nearest_phc_km: 11.2, nearest_school_km: 4.4, literacy_rate: 55.1, health_index: 44.9, flood_prone: true, air_quality_index: 138, years_since_last_dev_spend: 10 },
  { ward_id: "LKO-W10", ward_name: "Bijnor", constituency: "Lucknow", population: 33900, sc_st_percentage: 20.8, nearest_phc_km: 7.1, nearest_school_km: 2.7, literacy_rate: 63.5, health_index: 50.2, flood_prone: false, air_quality_index: 160, years_since_last_dev_spend: 6 },
];

const wardById = (id: string) => WARD_PROFILES.find((w) => w.ward_id === id);

// ---------------------------------------------------------------------------
// Priority scoring — TS port of agents/priority_ranking_agent.py
// ---------------------------------------------------------------------------

const NORMALIZATION_BOUNDS: Record<string, [number, number]> = {
  unique_reporter_count: [0, 1000],
  ward_population: [0, 100_000],
  distance_to_facility_km: [0, 25],
  years_since_last_dev_spend: [0, 20],
  sc_st_percentage: [0, 100],
  estimated_cost_inr: [0, 5_000_000_000], // 0 to 500 Cr
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

type ScoringInput = {
  unique_reporter_count: number;
  ward_population: number;
  distance_to_facility_km: number;
  infrastructure_gap_index: number; // 0-1
  years_since_last_dev_spend: number;
  flood_prone: boolean;
  acute_urgency_signal: boolean;
  sc_st_percentage: number;
  estimated_cost_inr: number;
};

export function scoreCluster(inputs: ScoringInput, weights: Weights): { priority_score: number; score_breakdown: ScoreBreakdown } {
  const b = NORMALIZATION_BOUNDS;
  const emergency = inputs.flood_prone || inputs.acute_urgency_signal ? 1 : 0;

  const components: Record<string, number> = {
    unique_reporter_count: normalize(inputs.unique_reporter_count, ...b.unique_reporter_count),
    ward_population: normalize(inputs.ward_population, ...b.ward_population),
    distance_to_facility_km: normalize(inputs.distance_to_facility_km, ...b.distance_to_facility_km),
    infrastructure_gap_index: Math.max(0, Math.min(1, inputs.infrastructure_gap_index)),
    years_since_last_dev_spend: normalize(inputs.years_since_last_dev_spend, ...b.years_since_last_dev_spend),
    emergency_multiplier: emergency,
    sc_st_percentage: normalize(inputs.sc_st_percentage, ...b.sc_st_percentage),
    estimated_cost_inr: normalize(inputs.estimated_cost_inr, ...b.estimated_cost_inr),
  };

  const w = weights as unknown as Record<string, number>;
  const weighted: Record<string, number> = {};
  for (const k of Object.keys(components)) {
    weighted[k] = Math.round(components[k] * w[k] * 10000) / 10000;
  }
  let total = Object.values(weighted).reduce((a, v) => a + v, 0);
  total = Math.max(0, Math.min(1, Math.round(total * 10000) / 10000));

  return {
    priority_score: total,
    score_breakdown: {
      normalized_components: components,
      weighted_contributions: weighted,
      weights_used: { ...w },
    },
  };
}

// ---------------------------------------------------------------------------
// Seed clusters (aggregated from data/seed_submissions.json + expanded)
// ---------------------------------------------------------------------------

type MockCluster = {
  cluster_id: string;
  category: string;
  ward_id: string;
  unique_reporter_count: number;
  channel_breakdown: Record<string, number>;
  status: string;
  one_line_summary: string;
  centroid: { lat: number; lng: number };
  first_reported: string;
  last_reported: string;
  scoring: ScoringInput;
  recommendation: Recommendation;
  annotations: { note: string; officer_name: string; timestamp: string }[];
  reporters: Set<string>;
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

function makeCluster(
  c: Omit<MockCluster, "scoring" | "annotations" | "reporters" | "recommendation"> & {
    scoring: Partial<ScoringInput> & { estimated_cost_inr: number; acute_urgency_signal?: boolean };
    recommendation: Recommendation;
  }
): MockCluster {
  const ward = wardById(c.ward_id)!;
  return {
    ...c,
    scoring: {
      unique_reporter_count: c.unique_reporter_count,
      ward_population: ward.population,
      distance_to_facility_km: c.scoring.distance_to_facility_km ?? ward.nearest_phc_km,
      infrastructure_gap_index: c.scoring.infrastructure_gap_index ?? (1 - ward.health_index / 100),
      years_since_last_dev_spend: ward.years_since_last_dev_spend,
      flood_prone: ward.flood_prone,
      acute_urgency_signal: c.scoring.acute_urgency_signal ?? false,
      sc_st_percentage: ward.sc_st_percentage,
      estimated_cost_inr: c.scoring.estimated_cost_inr,
    },
    annotations: [],
    reporters: new Set<string>(),
  };
}

const CLUSTERS: MockCluster[] = [
  makeCluster({
    cluster_id: "CL-001", category: "Road", ward_id: "LKO-W04",
    unique_reporter_count: 214,
    channel_breakdown: { whatsapp: 118, sms: 41, text: 38, voice: 17 },
    status: "new",
    one_line_summary: "Deep pothole cluster near Malihabad crossing causing daily near-accidents",
    centroid: { lat: 26.966, lng: 80.716 },
    first_reported: daysAgo(34), last_reported: daysAgo(0),
    scoring: { distance_to_facility_km: 2.0, infrastructure_gap_index: 0.72, acute_urgency_signal: true, estimated_cost_inr: 18_000_000 },
    recommendation: {
      recommended_action: "Resurface 2.4 km stretch of Malihabad crossing road with full-depth pothole repair and drainage-side patching",
      reasoning: [
        "214 unique citizens reported across 4 channels in 34 days — highest report velocity in the constituency",
        "Acute urgency signal: repeated mentions of daily near-accidents involving school transport",
        "Ward has gone 9 years without road development spend; infrastructure gap index 0.72",
      ],
      estimated_budget_inr_cr: 1.8, expected_beneficiaries: 28700,
      relevant_scheme: "Pradhan Mantri Gram Sadak Yojana (PMGSY-III)",
      priority_rank: 1, estimated_timeline_months: 4, confidence: 0.91, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-002", category: "Water", ward_id: "LKO-W02",
    unique_reporter_count: 187,
    channel_breakdown: { whatsapp: 92, text: 55, sms: 28, voice: 12 },
    status: "under_review",
    one_line_summary: "Chinhat floods every monsoon — no storm drainage, water enters homes",
    centroid: { lat: 26.912, lng: 81.001 },
    first_reported: daysAgo(58), last_reported: daysAgo(1),
    scoring: { distance_to_facility_km: 3.4, infrastructure_gap_index: 0.68, acute_urgency_signal: true, estimated_cost_inr: 64_000_000 },
    recommendation: {
      recommended_action: "Construct 3.1 km storm-water drainage network with two pumping stations for Chinhat low-lying blocks",
      reasoning: [
        "Ward is flood-prone with 187 unique reporters; complaints spike every monsoon for 3 consecutive years",
        "45,500 residents affected; water-borne disease reports correlate in PHC records",
        "AMRUT 2.0 funds available for urban drainage in this district",
      ],
      estimated_budget_inr_cr: 6.4, expected_beneficiaries: 45500,
      relevant_scheme: "AMRUT 2.0 — Urban Storm Water Drainage",
      priority_rank: 2, estimated_timeline_months: 11, confidence: 0.87, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-003", category: "Health", ward_id: "LKO-W04",
    unique_reporter_count: 96,
    channel_breakdown: { text: 44, whatsapp: 33, voice: 19 },
    status: "recommended",
    one_line_summary: "Nearest PHC 9.4 km from Malihabad villages — emergencies and maternal care at risk",
    centroid: { lat: 26.97, lng: 80.718 },
    first_reported: daysAgo(71), last_reported: daysAgo(3),
    scoring: { distance_to_facility_km: 9.4, infrastructure_gap_index: 0.81, acute_urgency_signal: false, estimated_cost_inr: 92_000_000 },
    recommendation: {
      recommended_action: "Sanction a new Primary Health Centre with 24x7 maternal care wing in Malihabad block",
      reasoning: [
        "Facility distance of 9.4 km is worst-quartile statewide; 96 unique reporters cite emergency access",
        "Ward SC/ST share 31.6% — priority under NHM equity guidelines",
        "Health index 47.8 is the second lowest in the constituency",
      ],
      estimated_budget_inr_cr: 9.2, expected_beneficiaries: 28700,
      relevant_scheme: "National Health Mission — PHC Infrastructure",
      priority_rank: 3, estimated_timeline_months: 18, confidence: 0.84, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-004", category: "Education", ward_id: "LKO-W09",
    unique_reporter_count: 71,
    channel_breakdown: { sms: 31, whatsapp: 25, text: 15 },
    status: "new",
    one_line_summary: "Nagram primary school building has cracked walls — unsafe for children",
    centroid: { lat: 26.72, lng: 81.05 },
    first_reported: daysAgo(22), last_reported: daysAgo(1),
    scoring: { distance_to_facility_km: 4.4, infrastructure_gap_index: 0.77, acute_urgency_signal: true, estimated_cost_inr: 25_000_000 },
    recommendation: {
      recommended_action: "Structural audit and reconstruction of Nagram primary school block; temporary relocation to panchayat bhawan",
      reasoning: [
        "Acute safety signal: cracked load-bearing walls reported with photos by 71 unique citizens",
        "Ward literacy 55.1% is constituency-lowest; school closure would worsen dropout",
        "Samagra Shiksha infrastructure grant window open this quarter",
      ],
      estimated_budget_inr_cr: 2.5, expected_beneficiaries: 21400,
      relevant_scheme: "Samagra Shiksha Abhiyan — School Infrastructure",
      priority_rank: 4, estimated_timeline_months: 8, confidence: 0.88, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-005", category: "Electricity", ward_id: "LKO-W07",
    unique_reporter_count: 124,
    channel_breakdown: { whatsapp: 67, voice: 29, sms: 28 },
    status: "actioned",
    one_line_summary: "Repeated outages in Bakshi Ka Talab — overloaded transformer failing",
    centroid: { lat: 26.99, lng: 80.87 },
    first_reported: daysAgo(45), last_reported: daysAgo(2),
    scoring: { distance_to_facility_km: 3.0, infrastructure_gap_index: 0.61, acute_urgency_signal: false, estimated_cost_inr: 8_500_000 },
    recommendation: {
      recommended_action: "Replace 250 kVA transformer with 400 kVA unit and rebalance feeder load across two circuits",
      reasoning: [
        "124 unique reporters; outage complaints cluster around evening peak hours",
        "Transformer is 14 years old and past rated life; discom inspection confirms overload",
        "RDSS loss-reduction funds applicable",
      ],
      estimated_budget_inr_cr: 0.85, expected_beneficiaries: 29800,
      relevant_scheme: "Revamped Distribution Sector Scheme (RDSS)",
      priority_rank: 5, estimated_timeline_months: 2, confidence: 0.93, mp_decision: "approved",
    },
  }),
  makeCluster({
    cluster_id: "CL-006", category: "Water", ward_id: "LKO-W05",
    unique_reporter_count: 83,
    channel_breakdown: { text: 39, whatsapp: 30, sms: 14 },
    status: "new",
    one_line_summary: "Hand pumps dry in Mohanlalganj hamlets — women walking 2+ km for water",
    centroid: { lat: 26.68, lng: 80.98 },
    first_reported: daysAgo(29), last_reported: daysAgo(0),
    scoring: { distance_to_facility_km: 2.2, infrastructure_gap_index: 0.66, acute_urgency_signal: false, estimated_cost_inr: 32_000_000 },
    recommendation: {
      recommended_action: "Extend Jal Jeevan Mission piped water to 4 uncovered hamlets; recharge 12 defunct hand pumps",
      reasoning: [
        "83 unique reporters, majority women, citing 2+ km daily water fetch",
        "Groundwater table dropped 4m in 5 years per CGWB block data",
        "JJM functional-household-tap coverage in ward is 61% vs 78% district average",
      ],
      estimated_budget_inr_cr: 3.2, expected_beneficiaries: 36200,
      relevant_scheme: "Jal Jeevan Mission (Har Ghar Jal)",
      priority_rank: 6, estimated_timeline_months: 9, confidence: 0.82, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-007", category: "Sanitation", ward_id: "LKO-W06",
    unique_reporter_count: 58,
    channel_breakdown: { whatsapp: 31, text: 18, sms: 9 },
    status: "under_review",
    one_line_summary: "Garbage collection skipped for weeks in Alambagh market lanes",
    centroid: { lat: 26.803, lng: 80.905 },
    first_reported: daysAgo(18), last_reported: daysAgo(1),
    scoring: { distance_to_facility_km: 1.2, infrastructure_gap_index: 0.52, acute_urgency_signal: false, estimated_cost_inr: 4_200_000 },
    recommendation: {
      recommended_action: "Add two compactor routes for Alambagh market zone and enforce twice-daily lifting via ULB contract amendment",
      reasoning: [
        "58 unique reporters with photo evidence of overflow points",
        "Vector-borne disease season approaching; market density amplifies risk",
        "SBM-U 2.0 O&M funds cover route expansion",
      ],
      estimated_budget_inr_cr: 0.42, expected_beneficiaries: 41000,
      relevant_scheme: "Swachh Bharat Mission Urban 2.0",
      priority_rank: 7, estimated_timeline_months: 1, confidence: 0.9, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-008", category: "Women Safety", ward_id: "LKO-W08",
    unique_reporter_count: 49,
    channel_breakdown: { text: 24, whatsapp: 19, voice: 6 },
    status: "new",
    one_line_summary: "Dark stretch near Sarojini Nagar rail underpass — streetlights dead for months",
    centroid: { lat: 26.77, lng: 80.86 },
    first_reported: daysAgo(40), last_reported: daysAgo(4),
    scoring: { distance_to_facility_km: 1.8, infrastructure_gap_index: 0.48, acute_urgency_signal: true, estimated_cost_inr: 3_600_000 },
    recommendation: {
      recommended_action: "Install 42 LED streetlights with dusk sensors along the underpass corridor; add one PCR patrol checkpoint",
      reasoning: [
        "Acute urgency: safety incidents reported after dark by 49 unique citizens",
        "Nirbhaya Fund urban-safety component applicable for lighting + patrol",
        "Corridor connects two high-footfall bus stops used by working women",
      ],
      estimated_budget_inr_cr: 0.36, expected_beneficiaries: 52300,
      relevant_scheme: "Nirbhaya Fund — Safe City Infrastructure",
      priority_rank: 8, estimated_timeline_months: 2, confidence: 0.86, mp_decision: "pending",
    },
  }),
  makeCluster({
    cluster_id: "CL-009", category: "Agriculture", ward_id: "LKO-W10",
    unique_reporter_count: 37,
    channel_breakdown: { voice: 16, whatsapp: 13, sms: 8 },
    status: "resolved",
    one_line_summary: "Canal tail-end farmers in Bijnor not receiving irrigation water on rotation",
    centroid: { lat: 26.74, lng: 80.82 },
    first_reported: daysAgo(88), last_reported: daysAgo(12),
    scoring: { distance_to_facility_km: 5.0, infrastructure_gap_index: 0.55, acute_urgency_signal: false, estimated_cost_inr: 12_000_000 },
    recommendation: {
      recommended_action: "Desilt 4.2 km tail-end canal section and install rotational flow gauges with panchayat-monitored schedule",
      reasoning: [
        "37 farmer households reported via voice in Awadhi; rabi sowing window at risk",
        "Canal siltation confirmed by irrigation dept survey",
        "PMKSY Har Khet Ko Pani component covers desilting",
      ],
      estimated_budget_inr_cr: 1.2, expected_beneficiaries: 33900,
      relevant_scheme: "PM Krishi Sinchayee Yojana (PMKSY)",
      priority_rank: 9, estimated_timeline_months: 3, confidence: 0.85, mp_decision: "approved",
    },
  }),
  makeCluster({
    cluster_id: "CL-010", category: "Transport", ward_id: "LKO-W01",
    unique_reporter_count: 44,
    channel_breakdown: { text: 21, whatsapp: 15, sms: 8 },
    status: "new",
    one_line_summary: "No city bus service to Aliganj sector K-L after evening — commuters stranded",
    centroid: { lat: 26.895, lng: 80.94 },
    first_reported: daysAgo(15), last_reported: daysAgo(0),
    scoring: { distance_to_facility_km: 2.6, infrastructure_gap_index: 0.38, acute_urgency_signal: false, estimated_cost_inr: 6_000_000 },
    recommendation: {
      recommended_action: "Extend two evening city-bus routes to Aliganj sectors K-L with last departure at 22:30",
      reasoning: [
        "44 unique reporters, complaints concentrated between 19:00-22:00",
        "City transport corporation has idle fleet capacity on adjacent depot",
        "PM-eBus Sewa augmentation applicable for route extension",
      ],
      estimated_budget_inr_cr: 0.6, expected_beneficiaries: 32000,
      relevant_scheme: "PM-eBus Sewa",
      priority_rank: 10, estimated_timeline_months: 2, confidence: 0.79, mp_decision: "pending",
    },
  }),
];

// ---------------------------------------------------------------------------
// Mutable in-memory state
// ---------------------------------------------------------------------------

type SubmissionRecord = {
  submission_id: string;
  citizen_phone_hash: string;
  category: string;
  summary: string;
  status: string;
  timestamp: string;
  cluster_id: string;
};

const submissions: SubmissionRecord[] = [];
let submissionCounter = 100;
let clusterCounter = CLUSTERS.length;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));

function toSummary(c: MockCluster, weights: Weights = DEFAULT_WEIGHTS): ClusterSummary {
  const { priority_score, score_breakdown } = scoreCluster(c.scoring, weights);
  return {
    cluster_id: c.cluster_id,
    category: c.category,
    ward_id: c.ward_id,
    unique_reporter_count: c.unique_reporter_count,
    channel_breakdown: c.channel_breakdown,
    status: c.status,
    one_line_summary: c.one_line_summary,
    centroid: c.centroid,
    first_reported: c.first_reported,
    last_reported: c.last_reported,
    priority_score,
    score_breakdown,
  };
}

function ranked(weights: Weights = DEFAULT_WEIGHTS): ClusterSummary[] {
  return CLUSTERS.map((c) => toSummary(c, weights))
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// Naive keyword classifier — mirrors the backend's mock mode but smarter.
const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ["Road", /road|sadak|pothole|gaddha|street|highway|crossing/i],
  ["Water", /water|pani|drainage|flood|pipe|tap|nal|hand ?pump|sewage/i],
  ["Health", /hospital|phc|doctor|clinic|health|dawai|medicine|ambulance|pregnan/i],
  ["Education", /school|teacher|padhai|education|college|classroom/i],
  ["Electricity", /bijli|electric|power|transformer|light|outage|current/i],
  ["Sanitation", /garbage|kachra|waste|toilet|safai|sanita|drain/i],
  ["Women Safety", /safety|harass|dark|streetlight|unsafe|chhed/i],
  ["Transport", /bus|auto|transport|metro|train|rickshaw/i],
  ["Agriculture", /farm|kisan|crop|fasal|canal|irrigation|khet/i],
  ["Employment", /job|rozgar|employment|naukri|wage|mnrega/i],
];

function classify(text: string): string {
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return cat;
  }
  return "Other";
}

// ---------------------------------------------------------------------------
// Mock API implementation (same signatures as the real `api` object)
// ---------------------------------------------------------------------------

export const mockApi = {
  async listConstituencies(): Promise<ConstituencyRollup[]> {
    await delay();
    const total_reports = CLUSTERS.reduce((a, c) => a + c.unique_reporter_count, 0);
    return [
      {
        constituency: "Lucknow",
        ward_count: WARD_PROFILES.length,
        total_clusters: CLUSTERS.length,
        total_reports,
        actioned_count: CLUSTERS.filter((c) => c.status === "actioned").length,
        resolved_count: CLUSTERS.filter((c) => c.status === "resolved").length,
      },
    ];
  },

  async implementationTracker(constituency?: string) {
    await delay();
    return ranked()
      .filter(() => !constituency || constituency === "Lucknow")
      .map((s) => ({
        ...s,
        recommendation: CLUSTERS.find((c) => c.cluster_id === s.cluster_id)!.recommendation,
      }));
  },

  async updateClusterStatus(clusterId: string, status: string): Promise<ClusterSummary> {
    await delay(120);
    const c = CLUSTERS.find((x) => x.cluster_id === clusterId);
    if (!c) throw new Error(`Cluster ${clusterId} not found`);
    c.status = status;
    return toSummary(c);
  },

  async panchayatWardDetail(wardId: string): Promise<{ ward: WardDetail; clusters: ClusterSummary[] }> {
    await delay();
    const ward = wardById(wardId);
    if (!ward) throw new Error(`Ward ${wardId} not found`);
    return {
      ward,
      clusters: ranked().filter((c) => c.ward_id === wardId),
    };
  },

  async annotateCluster(clusterId: string, note: string, officerName: string) {
    await delay(120);
    const c = CLUSTERS.find((x) => x.cluster_id === clusterId);
    if (!c) throw new Error(`Cluster ${clusterId} not found`);
    c.annotations.push({ note, officer_name: officerName, timestamp: new Date().toISOString() });
    return { cluster_id: clusterId, annotations: c.annotations };
  },

  async createSubmission(payload: {
    citizen_phone_hash: string;
    channel: "voice" | "text" | "photo" | "whatsapp" | "sms";
    raw_text?: string;
    image_url?: string;
    lat?: number;
    lng?: number;
    ward_id?: string;
  }) {
    await delay(600); // simulate the AI pipeline
    const category = classify(payload.raw_text || "");
    const wardId = payload.ward_id || "LKO-W01";
    const summary = (payload.raw_text || "Photo report").slice(0, 96);

    // Duplicate detection: same category + ward -> join existing cluster
    const existing = CLUSTERS.find((c) => c.category === category && c.ward_id === wardId);
    const submissionId = `SUB-${++submissionCounter}`;
    let clusterId: string;
    let isNew = false;
    let oneLine: string;

    if (existing) {
      if (!existing.reporters.has(payload.citizen_phone_hash)) {
        existing.reporters.add(payload.citizen_phone_hash);
        existing.unique_reporter_count += 1;
        existing.channel_breakdown[payload.channel] = (existing.channel_breakdown[payload.channel] || 0) + 1;
        existing.scoring.unique_reporter_count = existing.unique_reporter_count;
      }
      existing.last_reported = new Date().toISOString();
      clusterId = existing.cluster_id;
      oneLine = existing.one_line_summary;
    } else {
      isNew = true;
      clusterId = `CL-${String(++clusterCounter).padStart(3, "0")}`;
      const ward = wardById(wardId)!;
      CLUSTERS.push(
        makeCluster({
          cluster_id: clusterId,
          category,
          ward_id: wardId,
          unique_reporter_count: 1,
          channel_breakdown: { [payload.channel]: 1 },
          status: "new",
          one_line_summary: summary,
          centroid: { lat: payload.lat ?? 26.85, lng: payload.lng ?? 80.95 },
          first_reported: new Date().toISOString(),
          last_reported: new Date().toISOString(),
          scoring: { estimated_cost_inr: 10_000_000 },
          recommendation: {
            recommended_action: `Investigate and scope works for: ${summary}`,
            reasoning: [
              "Newly formed cluster from citizen report — awaiting corroborating reports",
              `Ward ${ward.ward_name} profile applied for baseline scoring`,
            ],
            estimated_budget_inr_cr: 1.0,
            expected_beneficiaries: ward.population,
            relevant_scheme: "To be determined after site assessment",
            priority_rank: CLUSTERS.length + 1,
            estimated_timeline_months: 6,
            confidence: 0.55,
            mp_decision: "pending",
          },
        })
      );
      oneLine = summary;
    }

    submissions.push({
      submission_id: submissionId,
      citizen_phone_hash: payload.citizen_phone_hash,
      category,
      summary,
      status: "received",
      timestamp: new Date().toISOString(),
      cluster_id: clusterId,
    });

    return {
      submission_id: submissionId,
      cluster_id: clusterId,
      is_new_cluster: isNew,
      category,
      one_line_summary: oneLine,
    };
  },

  async checkUpvoteMatch(payload: { category: string; ward_id: string; draft_summary: string }) {
    await delay(300);
    const match = CLUSTERS.find((c) => c.category === payload.category && c.ward_id === payload.ward_id);
    if (!match) return { match_found: false as const };
    return {
      match_found: true as const,
      cluster_id: match.cluster_id,
      unique_reporter_count: match.unique_reporter_count,
      one_line_summary: match.one_line_summary,
    };
  },

  async applyUpvote(payload: { cluster_id: string; citizen_phone_hash: string }) {
    await delay(150);
    const c = CLUSTERS.find((x) => x.cluster_id === payload.cluster_id);
    if (!c) throw new Error(`Cluster ${payload.cluster_id} not found`);
    if (!c.reporters.has(payload.citizen_phone_hash)) {
      c.reporters.add(payload.citizen_phone_hash);
      c.unique_reporter_count += 1;
      c.scoring.unique_reporter_count = c.unique_reporter_count;
    }
    return { cluster_id: c.cluster_id, unique_reporter_count: c.unique_reporter_count };
  },

  async topPriorities(_constituency: string, limit = 5): Promise<ClusterSummary[]> {
    await delay();
    return ranked().slice(0, limit);
  },

  async heatmap(_constituency: string): Promise<Hotspot[]> {
    await delay();
    // Group clusters into grid cells (~0.05 deg) like the hotspot agent
    const cells = new Map<string, MockCluster[]>();
    for (const c of CLUSTERS) {
      const key = `${Math.round(c.centroid.lat / 0.05)},${Math.round(c.centroid.lng / 0.05)}`;
      const arr = cells.get(key) || [];
      arr.push(c);
      cells.set(key, arr);
    }
    const maxReports = Math.max(...CLUSTERS.map((c) => c.unique_reporter_count));
    return Array.from(cells.values()).map((group) => {
      const total = group.reduce((a, c) => a + c.unique_reporter_count, 0);
      const dominant = group.reduce((a, b) => (a.unique_reporter_count >= b.unique_reporter_count ? a : b));
      return {
        lat: group.reduce((a, c) => a + c.centroid.lat, 0) / group.length,
        lng: group.reduce((a, c) => a + c.centroid.lng, 0) / group.length,
        weight: Math.min(1, total / (maxReports * 1.5)),
        cluster_count: group.length,
        dominant_category: dominant.category,
        cluster_ids: group.map((c) => c.cluster_id),
      };
    });
  },

  async rescore(_constituency: string, weights: Weights): Promise<ClusterSummary[]> {
    await delay(80);
    return ranked(weights);
  },

  async clusterDetail(clusterId: string) {
    await delay();
    const c = CLUSTERS.find((x) => x.cluster_id === clusterId);
    if (!c) throw new Error(`Cluster ${clusterId} not found`);
    const all = ranked();
    const summary = all.find((s) => s.cluster_id === clusterId)!;
    return { ...summary, recommendation: c.recommendation };
  },

  async regenerateRecommendation(clusterId: string) {
    await delay(800);
    const c = CLUSTERS.find((x) => x.cluster_id === clusterId);
    if (!c) throw new Error(`Cluster ${clusterId} not found`);
    return { cluster_id: clusterId, recommendation: c.recommendation };
  },

  async nearbyIssues(wardId: string): Promise<ClusterSummary[]> {
    await delay();
    return ranked().filter((c) => c.ward_id === wardId);
  },

  async submissionStatus(citizenPhoneHash: string) {
    await delay();
    return submissions
      .filter((s) => s.citizen_phone_hash === citizenPhoneHash)
      .map((s) => {
        const cluster = CLUSTERS.find((c) => c.cluster_id === s.cluster_id);
        return {
          submission_id: s.submission_id,
          category: s.category,
          summary: s.summary,
          status: cluster?.status ?? s.status,
          timestamp: s.timestamp,
        };
      });
  },

  async askAI(payload: {
    role: string;
    page: string;
    question: string;
    constituency?: string;
    ward_id?: string;
    citizen_context?: Record<string, unknown>;
  }) {
    await delay(500); // mimic the real LLM round-trip so the loading state is visible

    // Demo-mode answer: no real LLM call here, but it stays genuinely
    // "live" by pulling from the same in-memory CLUSTERS data the rest
    // of the mock backend uses, so the demo doesn't feel canned when
    // NEXT_PUBLIC_API_URL isn't set.
    const top = ranked()[0];
    let answer = `This is a demo response (no backend connected — set NEXT_PUBLIC_API_URL to talk to the real, RAG-grounded assistant). `;
    let usedLiveData = false;

    if (payload.role === "panchayat_officer" && payload.ward_id) {
      const wardClusters = ranked().filter((c) => c.ward_id === payload.ward_id);
      if (wardClusters.length > 0) {
        answer += `In ${payload.ward_id}, the top issue right now is "${wardClusters[0].one_line_summary}" with ${wardClusters[0].unique_reporter_count} reports.`;
        usedLiveData = true;
      } else {
        answer += `No issues are currently on record for ward ${payload.ward_id}.`;
      }
    } else if (
      (payload.role === "mp_office" || payload.role === "mla_office" || payload.role === "district_admin") &&
      top
    ) {
      answer += `The top-ranked issue in ${payload.constituency ?? "your constituency"} is "${top.one_line_summary}" (${top.category}, ${top.unique_reporter_count} reports).`;
      usedLiveData = true;
    } else if (payload.role === "citizen") {
      answer += `For "${payload.question}" — try the Submit page to report a new issue, or Browse to see and upvote nearby reports.`;
    } else {
      answer += `I don't have specific data for that yet in demo mode.`;
    }

    return {
      answer,
      suggested_actions: usedLiveData ? [] : ["Connect the real backend for grounded answers"],
      used_live_data: usedLiveData,
    };
  },
    // ====================== MULTIMODAL SUBMISSION ======================
  async submitMultimodal(formData: FormData): Promise<any> {
    await delay(1400); // simulate transcription + vision + classification pipeline

    const channel = (formData.get("channel") as string) || "voice_photo";
    const rawText = "Citizen reported deep potholes and broken drainage near the main crossing causing daily traffic issues.";

    const category = classify(rawText); // reuse your existing classify function

    const submissionId = `SUB-${++submissionCounter}`;
    const clusterId = "CL-001"; // demo: join existing cluster

    const formattedReport = `**Issue Summary**
Deep potholes and poor drainage reported at main crossing area.

**Location Details**
Geolocation captured: ${formData.get("latitude")}, ${formData.get("longitude")}

**Urgency**
High — multiple citizens affected, safety concern for vehicles and pedestrians.

**Recommended Next Steps**
Immediate site inspection and repair under PMGSY / ward maintenance fund.`;

    return {
      submission_id: submissionId,
      cluster_id: clusterId,
      is_new_cluster: false,
      category,
      one_line_summary: rawText.slice(0, 90),
      transcribed_text: rawText,
      translated_text: rawText,
      formatted_report: formattedReport,
      image_url: formData.get("image") ? "/images/uploaded/photo.jpg" : undefined,
    };
  },
};