import type { Alert, FiredEvent, Holding, RiskCalc, Threat, Trace } from "./types";
import { FEED_BY_ID } from "./data/feeds";
import { computeRisk, postureScore, THREAT_ORDER } from "./pipeline/calculus";

// Client-side derivations over stored traces. Everything here is pure, so the UI
// recomputes risk posture the instant holdings, hedges or alert status change.

export const navOf = (holdings: Holding[]) => holdings.reduce((s, h) => s + h.shares * h.price, 0);

export function eventRisks(ev: FiredEvent | undefined, trace: Trace | undefined, holdings: Holding[], hedges: Record<string, number>, nav: number): RiskCalc[] {
  if (!ev || !trace) return [];
  const feed = FEED_BY_ID[ev.feedId];
  const by = Object.fromEntries(holdings.map((h) => [h.ticker, h]));
  const out: RiskCalc[] = [];
  for (const hit of trace.screened) {
    const h = by[hit.ticker];
    const a = trace.jev.holdings[hit.ticker];
    if (!h || !a) continue;
    out.push(computeRisk(h, hit, a, { reliability: feed?.reliability ?? 0.8, followThrough: trace.jev.followThrough, hedgeRatio: hedges[h.ticker] ?? 0, nav }));
  }
  return out.sort(byThreat);
}

export function byThreat(a: RiskCalc, b: RiskCalc) {
  const d = THREAT_ORDER.indexOf(a.threat) - THREAT_ORDER.indexOf(b.threat);
  return d || b.expectedLoss - a.expectedLoss || b.probability - a.probability;
}

export interface Book {
  nav: number;
  eventVar: number;
  posture: number;
  active: { ev: FiredEvent; risks: RiskCalc[]; alert?: Alert }[];
  worstByTicker: Record<string, RiskCalc & { uid: string }>;
}

/** Live alerts older than this are treated as priced in and drop out of the book. */
export const LIVE_TTL_MS = 20 * 60_000;

/**
 * Aggregate live risk: stream events from the last LIVE_TTL_MS whose alert has not
 * been dismissed. Stress-test and custom scenarios are hypothetical and never move
 * the live book (they are ranked separately in the Stress Lab).
 */
export function bookOf(s: { holdings: Holding[]; events: FiredEvent[]; traces: Record<string, Trace>; alerts: Alert[]; hedges: Record<string, number> }): Book {
  const nav = navOf(s.holdings);
  const alertBy = Object.fromEntries(s.alerts.map((a) => [a.uid, a]));
  const active: Book["active"] = [];
  const worst: Book["worstByTicker"] = {};
  const maxLoss: Record<string, number> = {};
  for (const ev of s.events) {
    const tr = s.traces[ev.uid];
    if (!tr || ev.origin !== "stream" || Date.now() - ev.firedAt > LIVE_TTL_MS) continue;
    const alert = alertBy[ev.uid];
    if (alert?.status === "dismissed") continue;
    const risks = eventRisks(ev, tr, s.holdings, s.hedges, nav);
    active.push({ ev, risks, alert });
    // Linear decay: an event's residual risk fades as the market prices it in.
    const residual = 1 - (Date.now() - ev.firedAt) / LIVE_TTL_MS;
    for (const r of risks) {
      maxLoss[r.ticker] = Math.max(maxLoss[r.ticker] ?? 0, r.expectedLoss * residual);
      const cur = worst[r.ticker];
      if (!cur || byThreat(r, cur) < 0) worst[r.ticker] = { ...r, uid: ev.uid };
    }
  }
  // Event VaR: worst residual open-event loss per holding, summed. Overlapping narratives
  // (three tariff headlines in an hour) do not stack on the same position.
  const eventVar = Object.values(maxLoss).reduce((a, b) => a + b, 0);
  return { nav, eventVar, posture: postureScore(eventVar, nav || 1), active, worstByTicker: worst };
}

export const THREAT_META: Record<Threat, { color: string; label: string; short: string }> = {
  CRITICAL: { color: "var(--color-crit)", label: "Critical", short: "CRIT" },
  ELEVATED: { color: "var(--color-serious)", label: "Elevated", short: "ELEV" },
  GUARDED: { color: "var(--color-warn)", label: "Guarded", short: "GRD" },
  LOW: { color: "var(--color-good)", label: "Low", short: "LOW" },
  UPSIDE: { color: "var(--color-up)", label: "Upside volatility", short: "UP" },
};

export const usd = (x: number, digits = 1) => {
  const a = Math.abs(x);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(digits)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(digits)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}K` : a.toFixed(0);
  return `${x < 0 ? "−" : ""}$${s}`;
};
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
