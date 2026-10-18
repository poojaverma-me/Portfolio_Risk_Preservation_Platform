import "server-only";
import type { Extraction, Feed, Holding, JevHoldingAnswer, JevResult, NewsEvent, ScreenHit } from "../types";
import { MAG_BUCKETS, SYSTEMIC_SCALE } from "../pipeline/calculus";
import { classify } from "./classify";
import { fallbackScore } from "./fallback";

// ─── INTEGRATION POINT: JEV MODEL API (TypeSafe System One) ──────────────────────
// POST {JEV_API_URL}  Authorization: Bearer {TYPESAFE_API_KEY}
// body  { model, state: string, questions: { [id]: { type, instructions, criteria? } } }
//   choice → criteria: { option: description }     → { choice, confidence, probabilities }
//   score  → criteria: ordered list of levels       → { score, confidence, probabilities{"0".."n"} }
//   noul   → no criteria                            → { noul: 0..1 }
// One batched request scores every screened holding (exposure, direction, magnitude)
// plus two portfolio-level questions (systemic spread, follow-through).
const URL = process.env.JEV_API_URL ?? "https://api.typesafe.ai/v1/systemone";
const MODEL = process.env.JEV_MODEL ?? "jev-latest";
const PRICE_PER_MTOK = 0.042; // USD, input only; output tokens are free
const TIMEOUT_MS = 8000;

const EXPOSURE = {
  direct: "The event names this company or hits its core revenue, product or supply chain",
  indirect: "The event reaches it through suppliers, customers, sector peers or macro channels",
  peripheral: "Only a faint sentiment link with little fundamental impact",
  none: "No plausible exposure",
};
const DIRECTION = {
  down: "Share price more likely to fall over the event horizon",
  flat: "No meaningful price reaction expected",
  up: "Share price more likely to rise over the event horizon",
};

export const qid = (ticker: string, q: string) => `${ticker.replace(/[^A-Za-z0-9]/g, "_")}__${q}`;

export function buildJevRequest(event: NewsEvent, feed: Feed, x: Extraction, holdings: Holding[], hits: ScreenHit[]) {
  const byTicker = Object.fromEntries(holdings.map((h) => [h.ticker, h]));
  const lines = hits.map((hit) => {
    const h = byTicker[hit.ticker];
    const c = classify(h);
    return `- ${h.ticker} | ${h.name} | ${h.exchange} ${h.country} (${c.region}) | ${c.code} ${c.industryLabel} | mcap $${h.marketCapB}B | beta ${h.beta} | 30d vol ${h.vol30}% | tags: ${h.tags.join(", ")} | analyst link: ${hit.link}, ${hit.direction} — ${hit.chain.join(" → ")}`;
  });
  const state = [
    `EVENT (${feed.name}, ${feed.kind}, source reliability ${feed.reliability}): ${event.headline}`,
    event.body ? `DETAIL: ${event.body}` : "",
    `ANALYST SUMMARY: ${x.summary} | type ${x.eventType} | sentiment ${x.sentiment.toFixed(2)} | horizon ${x.horizon}`,
    `ANALYST REASONING: ${x.reasoning.join(" ")}`,
    `TRANSMISSION: ${x.dependencies.map((d) => `${d.from} → ${d.to} (${d.relation})`).join("; ")}`,
    `HOLDINGS UNDER REVIEW:`,
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");

  const questions: Record<string, unknown> = {
    portfolio__systemic: {
      type: "score",
      instructions: "How far is this event's market impact likely to spread?",
      criteria: SYSTEMIC_SCALE,
    },
    portfolio__follow_through: {
      type: "noul",
      instructions: "Will the measure or development described actually take effect, or be acted on by markets as described, within its horizon?",
    },
  };
  for (const hit of hits) {
    const h = byTicker[hit.ticker];
    const who = `${h.ticker} (${h.name}, ${classify(h).code})`;
    questions[qid(h.ticker, "exposure")] = { type: "choice", instructions: `How exposed is ${who} to this event?`, criteria: EXPOSURE };
    questions[qid(h.ticker, "direction")] = { type: "choice", instructions: `Over the event horizon, which way is ${who} likely to move because of this event?`, criteria: DIRECTION };
    questions[qid(h.ticker, "magnitude")] = { type: "score", instructions: `How large is the likely price move in ${who} caused by this event, in either direction?`, criteria: MAG_BUCKETS.map((b) => b.label) };
  }
  return { model: MODEL, state, questions };
}

type Ans = { type: string; probabilities?: Record<string, number>; noul?: number };

function choice<K extends string>(a: Ans | undefined, keys: readonly K[]): Record<K, number> {
  const p = a?.probabilities ?? {};
  const raw = keys.map((k) => Math.max(0, p[k] ?? 0));
  const t = raw.reduce((x, y) => x + y, 0) || 1;
  return Object.fromEntries(keys.map((k, i) => [k, raw[i] / t])) as Record<K, number>;
}
function scale(a: Ans | undefined, n: number): number[] {
  const p = a?.probabilities ?? {};
  const raw = Array.from({ length: n }, (_, i) => Math.max(0, p[String(i)] ?? 0));
  const t = raw.reduce((x, y) => x + y, 0) || 1;
  return raw.map((x) => x / t);
}

export async function scoreWithJev(event: NewsEvent, feed: Feed, x: Extraction, holdings: Holding[], hits: ScreenHit[]): Promise<JevResult> {
  if (!hits.length) return { ...fallbackScore(event, feed, x, holdings, hits), model: "skipped", latencyMs: 0, error: "No exposed holdings — Jev call skipped" };
  const key = process.env.TYPESAFE_API_KEY;
  const request = buildJevRequest(event, feed, x, holdings, hits);
  if (!key) return { ...fallbackScore(event, feed, x, holdings, hits), request, error: "TYPESAFE_API_KEY not set" };

  const t0 = performance.now();
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - t0);
    const json = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 240)}`);
    const answers: Record<string, Ans> = json.answers ?? {};
    const out: Record<string, JevHoldingAnswer> = {};
    for (const hit of hits) {
      out[hit.ticker] = {
        exposure: choice(answers[qid(hit.ticker, "exposure")], ["direct", "indirect", "peripheral", "none"] as const),
        direction: choice(answers[qid(hit.ticker, "direction")], ["down", "flat", "up"] as const),
        magnitude: scale(answers[qid(hit.ticker, "magnitude")], MAG_BUCKETS.length),
      };
    }
    const inputTokens = json.usage?.input_tokens ?? 0;
    return {
      mode: "live",
      model: json.model ?? MODEL,
      latencyMs,
      inputTokens,
      costUsd: (inputTokens * PRICE_PER_MTOK) / 1e6,
      request,
      response: json,
      holdings: out,
      systemic: scale(answers.portfolio__systemic, SYSTEMIC_SCALE.length),
      followThrough: answers.portfolio__follow_through?.noul ?? 0.5,
    };
  } catch (err) {
    return { ...fallbackScore(event, feed, x, holdings, hits), request, error: String((err as Error).message ?? err) };
  }
}
