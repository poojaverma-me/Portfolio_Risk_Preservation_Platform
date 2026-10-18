import { NextResponse } from "next/server";
import { analyze, type AnalyzeInput } from "@/lib/pipeline/run";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as AnalyzeInput;
  if (!body?.event?.headline || !Array.isArray(body.holdings)) {
    return NextResponse.json({ error: "event and holdings are required" }, { status: 400 });
  }
  return NextResponse.json(await analyze(body));
}
