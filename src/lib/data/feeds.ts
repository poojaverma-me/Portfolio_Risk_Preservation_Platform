import type { Feed } from "../types";

// 18 configurable intelligence sources. In this prototype every item they emit is a
// SIMULATED headline from src/lib/data/events.ts; the connector interface for a real
// feed is documented in README.md ("Feed connectors").
export const FEEDS: Feed[] = [
  { id: "x-trump", name: "Donald J. Trump", handle: "@realDonaldTrump · X", kind: "social", domain: "x.com", reliability: 0.62, latencySec: 3, coverage: "Tariffs, trade, federal contracts, pharma pricing" },
  { id: "x-treasury", name: "U.S. Treasury", handle: "@USTreasury · X", kind: "social", domain: "home.treasury.gov", reliability: 0.88, latencySec: 4, coverage: "Sanctions, FX, debt issuance" },
  { id: "wsb", name: "r/wallstreetbets", handle: "Reddit retail flow", kind: "social", domain: "reddit.com", reliability: 0.35, latencySec: 6, coverage: "Retail options flow, squeezes", premiumOnly: true },
  { id: "bloomberg", name: "Bloomberg", handle: "First Word wire", kind: "wire", domain: "bloomberg.com", reliability: 0.95, latencySec: 2, coverage: "Global markets, corporate, macro" },
  { id: "reuters", name: "Reuters", handle: "Breakingviews + wire", kind: "wire", domain: "reuters.com", reliability: 0.95, latencySec: 2, coverage: "Global news, commodities, geopolitics" },
  { id: "ft", name: "Financial Times", handle: "FT markets", kind: "wire", domain: "ft.com", reliability: 0.92, latencySec: 8, coverage: "Europe, regulation, deals" },
  { id: "wsj", name: "Wall Street Journal", handle: "WSJ Pro", kind: "wire", domain: "wsj.com", reliability: 0.92, latencySec: 8, coverage: "US policy, corporate scoops" },
  { id: "nikkei", name: "Nikkei Asia", handle: "Asia tech desk", kind: "wire", domain: "asia.nikkei.com", reliability: 0.9, latencySec: 10, coverage: "Asian supply chains, semis", premiumOnly: true },
  { id: "caixin", name: "Caixin Global", handle: "China macro", kind: "wire", domain: "caixinglobal.com", reliability: 0.84, latencySec: 12, coverage: "PBoC, Chinese policy, property", premiumOnly: true },
  { id: "sec", name: "SEC EDGAR", handle: "8-K / 6-K filings", kind: "regulator", domain: "sec.gov", reliability: 0.99, latencySec: 1, coverage: "Material corporate disclosures" },
  { id: "fda", name: "FDA", handle: "Approvals & CRLs", kind: "regulator", domain: "fda.gov", reliability: 0.99, latencySec: 5, coverage: "Drug and device decisions" },
  { id: "cms", name: "CMS", handle: "Medicare bulletins", kind: "regulator", domain: "cms.gov", reliability: 0.98, latencySec: 6, coverage: "Medicare rates, drug negotiation", premiumOnly: true },
  { id: "bis", name: "Commerce · BIS", handle: "Export-control rules", kind: "government", domain: "bis.gov", reliability: 0.98, latencySec: 4, coverage: "Entity list, chip export controls" },
  { id: "dod", name: "Department of Defense", handle: "Contract announcements", kind: "government", domain: "defense.gov", reliability: 0.99, latencySec: 3, coverage: "Daily contract awards > $7.5M" },
  { id: "fed", name: "Federal Reserve", handle: "FOMC statements", kind: "government", domain: "federalreserve.gov", reliability: 0.99, latencySec: 1, coverage: "Rates, balance sheet, guidance" },
  { id: "mofcom", name: "China MOFCOM", handle: "Commerce ministry notices", kind: "government", domain: "mofcom.gov.cn", reliability: 0.9, latencySec: 15, coverage: "Export licensing, countermeasures", premiumOnly: true },
  { id: "ustr", name: "USTR", handle: "Trade actions", kind: "government", domain: "ustr.gov", reliability: 0.97, latencySec: 5, coverage: "Section 301 / 232 actions", premiumOnly: true },
  { id: "fastmarkets", name: "Fastmarkets", handle: "Metals pricing", kind: "market", domain: "fastmarkets.com", reliability: 0.93, latencySec: 6, coverage: "Lithium, rare earths, base metals", premiumOnly: true },
];

export const FEED_BY_ID = Object.fromEntries(FEEDS.map((f) => [f.id, f])) as Record<string, Feed>;

export const FREE_FEED_LIMIT = 3;

export interface Profile {
  id: string;
  name: string;
  description: string;
  feeds: string[];
  premium?: boolean;
}

export const PROFILES: Profile[] = [
  { id: "macro", name: "Macro & Policy", description: "Presidential posts, the Fed and Reuters", feeds: ["x-trump", "fed", "reuters"] },
  { id: "semis", name: "Chip Supply Chain", description: "Export controls, Bloomberg, SEC filings", feeds: ["bis", "bloomberg", "sec"] },
  { id: "health", name: "Healthcare Regulatory", description: "FDA, SEC filings and Reuters", feeds: ["fda", "sec", "reuters"] },
  { id: "defense", name: "Defense & GovCon", description: "DoD awards, presidential posts, WSJ", feeds: ["dod", "x-trump", "wsj"] },
  { id: "minerals", name: "Critical Minerals", description: "MOFCOM, Fastmarkets, Reuters", feeds: ["mofcom", "fastmarkets", "reuters"], premium: true },
  { id: "full", name: "Full Surveillance", description: "All 18 sources, multi-source corroboration", feeds: [], premium: true },
];

export const KIND_LABEL: Record<Feed["kind"], string> = {
  social: "Social",
  wire: "News wire",
  regulator: "Regulator",
  government: "Government",
  market: "Market data",
};
