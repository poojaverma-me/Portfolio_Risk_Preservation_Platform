import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Extraction, Feed, Holding, LlmResult, NewsEvent } from "../types";
import { SECTORS, TAGS } from "../data/taxonomy";
import { heuristicExtract } from "./heuristic";
import { sanitizeExtraction } from "./sanitize";

// ─── INTEGRATION POINT: CLOUD LLM (Claude via the Anthropic Messages API) ────────
// Reads ANTHROPIC_API_KEY. The model turns unstructured news into entities, a
// dependency graph, sentiment and impact vectors expressed in the JEV tag vocabulary.
// Without a key (or on any failure) the pipeline uses the preset's curated fixture,
// or a keyword heuristic for custom headlines, and records why in the trace.
// Demo default: Claude Haiku 5.5 with thinking off and low effort, the fastest and
// cheapest configuration. Override with LLM_MODEL for deeper analysis.
const MODEL = process.env.LLM_MODEL ?? "claude-haiku-5-5";
const TIMEOUT_MS = 40_000;

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  return client;
}

// Short circuit after an auth/billing failure so every event doesn't wait on it.
let lastHardFailure: { at: number; reason: string } | null = null;

export function llmStatus() {
  if (!process.env.ANTHROPIC_API_KEY) return { live: false, model: MODEL, reason: "ANTHROPIC_API_KEY not set — using curated analyses" };
  if (lastHardFailure && Date.now() - lastHardFailure.at < 5 * 60_000) return { live: false, model: MODEL, reason: lastHardFailure.reason };
  return { live: true, model: MODEL, reason: "ready" };
}

const SYSTEM = `You are the event-analysis layer of an institutional capital-preservation platform.
Given one breaking news item and a portfolio, identify how the event transmits into specific holdings.
Think like a risk officer: first-order (named or core supply chain) vs second-order (suppliers, customers, peers, macro).
Respond with ONLY a JSON object, no prose and no internal or system XML tags, matching:
{
 "summary": string (<= 25 words),
 "eventType": "trade-policy"|"export-control"|"regulatory"|"monetary"|"geopolitical"|"corporate"|"commodity"|"contract"|"fiscal"|"sentiment",
 "sentiment": number -1..1,
 "horizon": "intraday"|"days"|"weeks"|"months",
 "entities": [{"name": string, "type": "person"|"org"|"country"|"policy"|"commodity"|"product"|"index", "role": string}],
 "reasoning": [string]  (4-6 short analysis steps a portfolio manager can audit),
 "dependencies": [{"from": string, "to": string, "relation": string, "order": 1|2}],
 "vectors": [{"id": string, "label": string, "link": "direct"|"indirect", "direction": "down"|"up",
   "match": {"tickers"?: [string], "sectors"?: [sectorId], "industries"?: [industryId], "countries"?: [ISO2], "tags"?: [tag]},
   "chain": [string] (2-3 transmission steps; use {name} for the holding name)}]
}
Match semantics: a holding matches if its ticker is listed, OR it satisfies EVERY other dimension given (any value within a dimension). Prefer tags/industries so vectors also apply to holdings added later. Order vectors by importance.
Only include vectors with a plausible fundamental link.`;

function vocabulary() {
  const sectors = SECTORS.map((s) => `${s.id}: ${s.industries.map((i) => i.id).join(", ")}`).join("\n");
  const tags = Object.entries(TAGS)
    .map(([k, v]) => `${k} (${v})`)
    .join("; ");
  return `SECTOR ids → industry ids:\n${sectors}\nTAGS: ${tags}`;
}

export async function extract(event: NewsEvent, feed: Feed, holdings: Holding[], force?: "curated"): Promise<LlmResult> {
  const offline = (reason: string): LlmResult =>
    event.fixture
      ? { mode: "fixture", model: "curated fixture", latencyMs: 0, error: reason, extraction: event.fixture }
      : { mode: "heuristic", model: "keyword heuristic", latencyMs: 1, error: reason, extraction: heuristicExtract(event, holdings) };

  if (force === "curated") return offline("Curated mode selected in settings");
  const status = llmStatus();
  const c = getClient();
  if (!status.live || !c) return offline(status.reason);

  const book = holdings.map((h) => `${h.ticker} | ${h.name} | ${h.sector}/${h.industry} | ${h.country} | tags: ${h.tags.join(", ")}`).join("\n");
  const t0 = performance.now();
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: [{ type: "text", text: `${SYSTEM}\n\n${vocabulary()}`, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `SOURCE: ${feed.name} (${feed.handle}; ${feed.kind}; reliability ${feed.reliability})\nHEADLINE: ${event.headline}\nDETAIL: ${event.body}\n\nPORTFOLIO:\n${book}`,
        },
      ],
    });
    const latencyMs = Math.round(performance.now() - t0);
    if (res.stop_reason === "refusal") return offline(`Model declined (${res.stop_details?.category ?? "refusal"})`);
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const extraction: Extraction = sanitizeExtraction(JSON.parse(json));
    return { mode: "live", model: res.model, latencyMs, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, extraction };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      lastHardFailure = { at: Date.now(), reason: `Anthropic API rejected the key (${err.status})` };
    } else if (err instanceof Anthropic.BadRequestError) {
      lastHardFailure = { at: Date.now(), reason: `Anthropic API 400: ${err.message.slice(0, 160)}` };
    }
    return offline(err instanceof Anthropic.APIError ? `Anthropic API ${err.status}: ${err.message.slice(0, 160)}` : `LLM output unusable: ${String(err).slice(0, 160)}`);
  }
}
