// Shared domain types. Everything the server pipeline returns is plain JSON so the
// client can persist it and recompute risk locally (hedges, share changes).

export type SectorId =
  | "semis"
  | "health"
  | "minerals"
  | "quantum"
  | "govcon"
  | "energy"
  | "tech"
  | "financials";

export type CapTier = "small" | "mid" | "large";
export type Region = "DM" | "EM";

export interface Security {
  ticker: string;
  name: string;
  exchange: string;
  country: string; // ISO-2
  domain: string; // for the logo
  sector: SectorId;
  industry: string; // industry id from taxonomy
  marketCapB: number; // USD bn
  price: number; // USD equivalent
  beta: number;
  vol30: number; // 30d annualised vol, %
  tags: string[]; // exposure tags (see TAGS)
  blurb: string;
}

export interface Holding extends Security {
  id: string;
  shares: number;
  costBasis?: number;
}

export interface JevClass {
  capTier: CapTier;
  capLabel: string;
  sectorCode: string;
  industryCode: string;
  industryLabel: string;
  code: string; // e.g. JEV-L-SEMI.FBLS
  region: Region;
}

export type FeedKind = "social" | "wire" | "regulator" | "government" | "market";

export interface Feed {
  id: string;
  name: string;
  handle: string;
  kind: FeedKind;
  domain: string;
  reliability: number; // 0..1 source credibility prior
  latencySec: number; // typical ingest latency
  coverage: string;
  premiumOnly?: boolean;
}

export interface ImpactMatch {
  tickers?: string[];
  sectors?: SectorId[];
  industries?: string[];
  countries?: string[];
  tags?: string[];
}

export interface ImpactVector {
  id: string;
  label: string;
  match: ImpactMatch;
  link: "direct" | "indirect";
  direction: "down" | "up";
  chain: string[]; // transmission steps; "{name}" / "{ticker}" are filled per holding
}

export interface Entity {
  name: string;
  type: "person" | "org" | "country" | "policy" | "commodity" | "product" | "index";
  role: string;
}

export interface Dependency {
  from: string;
  to: string;
  relation: string;
  order: 1 | 2;
}

export type EventType =
  | "trade-policy"
  | "export-control"
  | "regulatory"
  | "monetary"
  | "geopolitical"
  | "corporate"
  | "commodity"
  | "contract"
  | "fiscal"
  | "sentiment";

export interface Extraction {
  summary: string;
  eventType: EventType;
  sentiment: number; // -1..1
  horizon: "intraday" | "days" | "weeks" | "months";
  entities: Entity[];
  reasoning: string[];
  dependencies: Dependency[];
  vectors: ImpactVector[];
}

export interface NewsEvent {
  id: string; // preset id or custom-<n>
  feedId: string;
  headline: string;
  body: string;
  label: string; // short name for stress lab
  author?: string;
  fixture?: Extraction; // curated analysis used when the live LLM is unavailable
}

export interface FiredEvent extends NewsEvent {
  uid: string; // unique per firing
  firedAt: number; // ms epoch
  origin: "stream" | "stress" | "custom";
}

export interface ScreenHit {
  ticker: string;
  vectorIds: string[];
  link: "direct" | "indirect";
  direction: "down" | "up";
  chain: string[];
}

// Raw per-holding answers from Jev (or the deterministic fallback in the same shape).
export interface JevHoldingAnswer {
  exposure: Record<"direct" | "indirect" | "peripheral" | "none", number>;
  direction: Record<"down" | "flat" | "up", number>;
  magnitude: number[]; // probabilities over MAG_BUCKETS
}

export interface JevResult {
  mode: "live" | "fallback";
  model: string;
  latencyMs: number;
  inputTokens: number;
  costUsd: number;
  error?: string;
  request?: unknown;
  response?: unknown;
  holdings: Record<string, JevHoldingAnswer>;
  systemic: number[]; // probabilities over SYSTEMIC_SCALE
  followThrough: number; // 0..1 noul
}

export interface LlmResult {
  mode: "live" | "fixture" | "heuristic";
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  extraction: Extraction;
}

export type Threat = "CRITICAL" | "ELEVATED" | "GUARDED" | "LOW" | "UPSIDE";

export interface RiskCalc {
  ticker: string;
  direction: "down" | "up";
  link: "direct" | "indirect";
  exposureWeight: number;
  pDirection: number;
  eventFactor: number;
  probability: number; // headline probability of the move
  range: [number, number]; // headline magnitude range %, P25-P75
  ci: [number, number]; // P10-P90 %
  expectedMovePct: number;
  positionValue: number;
  hedgeRatio: number;
  expectedLoss: number; // USD, downside only, after hedge
  threat: Threat;
  mechanism: string[];
}

export interface Trace {
  uid: string;
  eventId: string;
  receivedAt: number;
  completedAt: number;
  stages: { id: string; label: string; ms: number }[];
  llm: LlmResult;
  screened: ScreenHit[];
  screenedOut: number;
  jev: JevResult;
}

export interface Alert {
  uid: string; // == event uid
  createdAt: number;
  deliveredMs: number; // ingest → push latency
  threat: Threat;
  title: string;
  summary: string;
  tickers: { ticker: string; direction: "down" | "up"; probability: number; range: [number, number] }[];
  status: "new" | "read" | "hedged" | "reduced" | "dismissed";
  origin: "stream" | "stress" | "custom";
}
