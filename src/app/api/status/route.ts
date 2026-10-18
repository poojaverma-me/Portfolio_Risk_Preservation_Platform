import { NextResponse } from "next/server";
import { llmStatus } from "@/lib/llm/client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    llm: llmStatus(),
    jev: { live: Boolean(process.env.TYPESAFE_API_KEY), model: process.env.JEV_MODEL ?? "jev-latest" },
  });
}
