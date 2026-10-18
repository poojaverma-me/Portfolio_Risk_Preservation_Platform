import type { Extraction, Feed, Holding, JevHoldingAnswer, JevResult, NewsEvent, ScreenHit } from "../types";
import { MAG_BUCKETS } from "../pipeline/calculus";

// Deterministic stand-in with the same output shape as the live Jev call. Used when
// the API key is missing or the request fails, so the demo never dead-ends.

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000; // 0..1
}
const norm = (xs: number[]) => {
  const t = xs.reduce((a, b) => a + b, 0) || 1;
  return xs.map((x) => x / t);
};

const HORIZON_SCALE = { intraday: 0.85, days: 1, weeks: 1.1, months: 0.7 } as const;

export function fallbackAnswer(h: Holding, hit: ScreenHit, x: Extraction, seed: string): JevHoldingAnswer {
  const j = (hash(seed + h.ticker) - 0.5) * 0.1;
  const [d, i, p, n] = norm(hit.link === "direct" ? [0.78 + j, 0.14, 0.05, 0.03] : [0.12, 0.6 + j, 0.2, 0.08]);
  const s = Math.abs(x.sentiment);
  const main = (hit.link === "direct" ? 0.62 : 0.48) + 0.3 * s + j;
  const rest = 1 - main;
  const dir = hit.direction === "down" ? { down: main, flat: rest * 0.7, up: rest * 0.3 } : { up: main, flat: rest * 0.7, down: rest * 0.3 };

  const center = (hit.link === "direct" ? 4.6 : 2.1) * Math.pow(h.vol30 / 40, 0.6) * (0.6 + 0.7 * s) * HORIZON_SCALE[x.horizon];
  const magnitude = norm(MAG_BUCKETS.map((b) => Math.exp(-((Math.log(b.mid) - Math.log(center)) ** 2) / (2 * 0.5 ** 2))));
  return { exposure: { direct: d, indirect: i, peripheral: p, none: n }, direction: dir as JevHoldingAnswer["direction"], magnitude };
}

export function fallbackScore(event: NewsEvent, feed: Feed, x: Extraction, holdings: Holding[], hits: ScreenHit[]): JevResult {
  const by = Object.fromEntries(holdings.map((h) => [h.ticker, h]));
  const out: Record<string, JevHoldingAnswer> = {};
  for (const hit of hits) out[hit.ticker] = fallbackAnswer(by[hit.ticker], hit, x, event.id);
  const sectors = new Set(hits.map((h) => by[h.ticker].sector)).size;
  const systemic = norm(sectors <= 1 ? [0.45, 0.4, 0.12, 0.03] : sectors <= 3 ? [0.12, 0.38, 0.38, 0.12] : [0.05, 0.2, 0.45, 0.3]);
  const followThrough = feed.kind === "regulator" || feed.kind === "government" ? 0.88 : feed.kind === "wire" || feed.kind === "market" ? 0.8 : 0.5;
  return { mode: "fallback", model: "jev-fallback (deterministic)", latencyMs: 2, inputTokens: 0, costUsd: 0, holdings: out, systemic, followThrough };
}
