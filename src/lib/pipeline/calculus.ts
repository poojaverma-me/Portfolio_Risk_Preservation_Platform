import type { Holding, JevHoldingAnswer, RiskCalc, ScreenHit, Threat } from "../types";

// Stage 4: the risk calculus. Pure functions shared by server and client, so hedges
// and share changes recompute locally without another model call.

export const MAG_BUCKETS = [
  { lo: 0, hi: 1, mid: 0.5, label: "Absolute price move under 1%" },
  { lo: 1, hi: 3, mid: 2, label: "Absolute price move of 1–3%" },
  { lo: 3, hi: 7, mid: 5, label: "Absolute price move of 3–7%" },
  { lo: 7, hi: 12, mid: 9.5, label: "Absolute price move of 7–12%" },
  { lo: 12, hi: 20, mid: 15, label: "Absolute price move above 12%" },
];

export const SYSTEMIC_SCALE = [
  "Isolated to a single company",
  "Contained within one sector",
  "Spreads across related sectors and supply chains",
  "Broad cross-market contagion",
];

export const EXPOSURE_WEIGHTS = { direct: 1, indirect: 0.6, peripheral: 0.25, none: 0 } as const;

export const THREAT_ORDER: Threat[] = ["CRITICAL", "ELEVATED", "GUARDED", "UPSIDE", "LOW"];

/** Quantile of the piecewise-uniform distribution defined by bucket probabilities. */
export function quantile(probs: number[], q: number) {
  const total = probs.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  for (let i = 0; i < MAG_BUCKETS.length; i++) {
    const p = (probs[i] ?? 0) / total;
    if (acc + p >= q && p > 0) {
      const f = (q - acc) / p;
      const b = MAG_BUCKETS[i];
      return b.lo + f * (b.hi - b.lo);
    }
    acc += p;
  }
  return MAG_BUCKETS[MAG_BUCKETS.length - 1].hi;
}

export function eventFactor(reliability: number, followThrough: number) {
  return 0.45 + 0.55 * (0.5 * reliability + 0.5 * followThrough);
}

export interface CalcCtx {
  reliability: number;
  followThrough: number;
  hedgeRatio: number;
  nav: number;
}

export function computeRisk(h: Holding, hit: ScreenHit, a: JevHoldingAnswer, ctx: CalcCtx): RiskCalc {
  const e = a.exposure;
  const w = e.direct * EXPOSURE_WEIGHTS.direct + e.indirect * EXPOSURE_WEIGHTS.indirect + e.peripheral * EXPOSURE_WEIGHTS.peripheral;

  // The LLM proposes a direction; Jev can overrule it when it is clearly more confident.
  let direction = hit.direction;
  const opposite = direction === "down" ? "up" : "down";
  if (a.direction[opposite] > a.direction[direction] + 0.15) direction = opposite;
  const pDirection = a.direction[direction];

  const ef = eventFactor(ctx.reliability, ctx.followThrough);
  const probability = clamp(pDirection * (0.4 + 0.6 * w) * ef, 0, 0.99);

  const expectedMovePct = a.magnitude.reduce((s, p, i) => s + p * MAG_BUCKETS[i].mid, 0) / (sum(a.magnitude) || 1);
  const range: [number, number] = [quantile(a.magnitude, 0.25), quantile(a.magnitude, 0.75)];
  const ci: [number, number] = [quantile(a.magnitude, 0.1), quantile(a.magnitude, 0.9)];

  const positionValue = h.shares * h.price;
  const hedgeRatio = ctx.hedgeRatio;
  const expectedLoss = direction === "down" ? positionValue * (expectedMovePct / 100) * probability * (1 - hedgeRatio) : 0;

  return {
    ticker: h.ticker,
    direction,
    link: hit.link,
    exposureWeight: w,
    pDirection,
    eventFactor: ef,
    probability,
    range,
    ci,
    expectedMovePct,
    positionValue,
    hedgeRatio,
    expectedLoss,
    threat: threatOf(direction, probability, expectedMovePct * (1 - hedgeRatio), (expectedLoss / ctx.nav) * 100),
    mechanism: hit.chain,
  };
}

export function threatOf(direction: "down" | "up", p: number, movePct: number, lossPctNav: number): Threat {
  if (direction === "up") return p >= 0.4 && movePct >= 2 ? "UPSIDE" : "LOW";
  if ((p >= 0.65 && movePct >= 4.5) || lossPctNav >= 0.35) return "CRITICAL";
  if ((p >= 0.5 && movePct >= 2.5) || lossPctNav >= 0.15) return "ELEVATED";
  if (p >= 0.3 && movePct >= 1.2) return "GUARDED";
  return "LOW";
}

export function worstThreat(ts: Threat[]): Threat {
  for (const t of THREAT_ORDER) if (ts.includes(t)) return t;
  return "LOW";
}

/**
 * 0–100 capital-preservation posture; 100 means no event-driven loss expected.
 * Calibrated to the drawdown budget: at the budget the score is ~45, at half ~67.
 */
export function postureScore(eventVar: number, nav: number, budgetPct = 1.5) {
  return Math.round(100 * Math.exp(-((eventVar / nav) * 100 / budgetPct) * 0.8));
}

export const fmtRange = (r: [number, number]) => `${Math.max(0, Math.round(r[0]))}–${Math.max(1, Math.round(r[1]))}%`;

function sum(a: number[]) {
  return a.reduce((x, y) => x + y, 0);
}
function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}
