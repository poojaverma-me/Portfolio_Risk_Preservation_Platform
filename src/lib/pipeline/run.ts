import "server-only";
import type { Extraction, Holding, NewsEvent, Trace } from "../types";
import { FEED_BY_ID } from "../data/feeds";
import { extract } from "../llm/client";
import { scoreWithJev } from "../jev/client";
import { screen } from "./screen";

// Server-side orchestration: ingest → LLM extraction → screening → Jev scoring.
// The risk calculus (stage 4) runs on the client from the returned answers so that
// hedges and share changes re-price instantly.

export interface AnalyzeInput {
  uid: string;
  receivedAt: number;
  event: NewsEvent;
  holdings: Holding[];
  llmMode?: "auto" | "curated";
}

export async function analyze({ uid, receivedAt, event, holdings, llmMode }: AnalyzeInput): Promise<Trace> {
  const feed = FEED_BY_ID[event.feedId] ?? FEED_BY_ID.reuters;
  const t0 = Date.now();
  const llm = await extract(event, feed, holdings, llmMode === "curated" ? "curated" : undefined);
  const t1 = Date.now();
  const { hits, out } = screen(holdings, llm.extraction.vectors);
  const t2 = Date.now();
  const jev = await scoreWithJev(event, feed, llm.extraction, holdings, hits);
  const t3 = Date.now();
  return {
    uid,
    eventId: event.id,
    receivedAt,
    completedAt: t3,
    stages: [
      { id: "ingest", label: "Ingest & normalise", ms: Math.max(1, t0 - receivedAt) },
      { id: "llm", label: "LLM extraction", ms: llm.mode === "live" ? llm.latencyMs : t1 - t0 },
      { id: "screen", label: "Exposure screen", ms: Math.max(1, t2 - t1) },
      { id: "jev", label: "Jev scoring", ms: jev.mode === "live" ? jev.latencyMs : t3 - t2 },
    ],
    llm,
    screened: hits,
    screenedOut: out,
    jev,
  };
}

/** Re-run screening + Jev against a cached extraction (portfolio changed). */
export async function rescore(event: NewsEvent, extraction: Extraction, holdings: Holding[]) {
  const feed = FEED_BY_ID[event.feedId] ?? FEED_BY_ID.reuters;
  const { hits, out } = screen(holdings, extraction.vectors);
  const jev = await scoreWithJev(event, feed, extraction, holdings, hits);
  return { screened: hits, screenedOut: out, jev };
}
