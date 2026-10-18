import { NextResponse } from "next/server";
import { rescore } from "@/lib/pipeline/run";
import type { Extraction, Holding, NewsEvent } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { event, extraction, holdings } = (await req.json()) as { event: NewsEvent; extraction: Extraction; holdings: Holding[] };
  if (!event || !extraction || !Array.isArray(holdings)) {
    return NextResponse.json({ error: "event, extraction and holdings are required" }, { status: 400 });
  }
  return NextResponse.json(await rescore(event, extraction, holdings));
}
