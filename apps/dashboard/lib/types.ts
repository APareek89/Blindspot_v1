// Response shapes for the Blindspot /v1 API. The dashboard is a pure HTTP client —
// these mirror @blindspot/core return types without importing the server package.

export type RouteStatus = "healthy" | "at_risk" | "unevaluated";
export type GoldenOrigin = "upload" | "agent" | "grown";
export type GoldenLabel = "pass" | "fail" | "unlabeled";
export type RecStatus = "pending" | "approved" | "rejected";

export interface Policy {
  type: "cheapest_passing";
  minScore: number;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface CostQualityPoint {
  routeName: string;
  costPer1kCents: number | null;
  quality: number | null;
  status: RouteStatus;
}

export interface Activity {
  kind: "recommendation" | "drift";
  routeName: string;
  at: string;
  detail: string;
  status?: string;
}

export interface Overview {
  avgQuality: number | null;
  savedCentsPer1kRealized: number;
  savedCentsPer1kPending: number;
  pendingApprovals: number;
  driftAlerts: number;
  routesHealthy: number;
  routesAtRisk: number;
  routesUnevaluated: number;
  routeCount: number;
  costVsQuality: CostQualityPoint[];
  activity: Activity[];
}

export interface RouteSummary {
  id: string;
  name: string;
  liveModel: string | null;
  policy: Policy;
  autoApprove: boolean;
  createdAt: string;
  quality: number | null;
  costPer1kCents: number | null;
  sparkline: number[];
  candidateCount: number;
  hasGoldenSet: boolean;
  pendingRecs: number;
  status: RouteStatus;
}

export interface CandidateDetail {
  id: string;
  modelRef: string;
  source: string;
  enabled: boolean;
  isLive: boolean;
  score: number | null;
  costPer1kCents: number | null;
  latencyMs: number | null;
  lastEvaluatedAt: string | null;
}

export interface GoldenSet {
  id: string;
  routeId: string;
  version: number;
  origin: GoldenOrigin;
  createdAt: string;
}

export interface RouteDetail {
  route: {
    id: string;
    name: string;
    liveModel: string | null;
    policy: Policy;
    autoApprove: boolean;
    createdAt: string;
    costPer1kCents: number | null;
  };
  candidates: CandidateDetail[];
  scoreSeries: { score: number; version: number; at: string }[];
  goldenSets: GoldenSet[];
  pendingRecs: number;
}

export interface GoldenExample {
  id: string;
  goldenSetId: string;
  input: string;
  referenceOutput: string | null;
  rubric: string | null;
  label: GoldenLabel;
  active: boolean;
  createdAt: string;
}

export interface Evidence {
  fromModel: string | null;
  toModel: string;
  fromScore: number | null;
  toScore: number;
  costDeltaPct: number;
  latencyDeltaMs: number | null;
  perCriterion: { criterion: string; from: number | null; to: number }[];
  samples: { input: string; fromOutput: string | null; toOutput: string }[];
}

export interface Recommendation {
  id: string;
  routeId: string;
  routeName: string;
  fromModel: string | null;
  toModel: string;
  evidenceJson: Evidence;
  status: RecStatus;
  reason: string | null;
  createdAt: string;
}

export interface DriftEvent {
  id: string;
  routeId: string;
  routeName: string;
  modelRef: string;
  oldScore: number | null;
  newScore: number;
  action: string;
  createdAt: string;
  recommendationId: string | null;
}

export interface Trace {
  id: string;
  routeId: string | null;
  routeName: string;
  model: string;
  input: unknown;
  output: string | null;
  costCents: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface GatewayKey {
  id: string;
  prefix: string;
  createdAt: string;
}

export interface MintedKey extends GatewayKey {
  key: string;
}

export interface ProviderKey {
  provider: string;
  createdAt: string;
}

export interface Settings {
  costCapUsdPerEvalRun: number | null;
  defaultModel: string | null;
  judgeModel: string | null;
}

/** Providers the gateway can route to (mirrors @blindspot/shared PROVIDERS). */
export const PROVIDERS = [
  "anthropic",
  "openai",
  "gemini",
  "groq",
  "hf",
  "openrouter",
  "together",
  "ollama",
] as const;
export type Provider = (typeof PROVIDERS)[number];
