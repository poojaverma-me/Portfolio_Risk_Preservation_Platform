import { NextResponse } from "next/server";
import { SECTORS, INDUSTRY_BY_ID } from "@/lib/data/taxonomy";

export const runtime = "nodejs";

// JEV classification of a custom security: one Jev choice question over every
// industry domain in the taxonomy. Cap tier is computed deterministically client-side.
export async function POST(req: Request) {
  const { name, description } = (await req.json()) as { name: string; description: string };
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return NextResponse.json({ error: "TYPESAFE_API_KEY not set" }, { status: 503 });
  const criteria = Object.fromEntries(SECTORS.flatMap((s) => s.industries.map((i) => [i.id, `${s.label} — ${i.label}: ${i.hint}`])));
  const request = {
    model: process.env.JEV_MODEL ?? "jev-latest",
    state: `Company: ${name}\nDescription: ${description}`,
    questions: { industry: { type: "choice", instructions: "Which industry domain best describes this company's primary business?", criteria } },
  };
  const t0 = performance.now();
  try {
    const res = await fetch(process.env.JEV_API_URL ?? "https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const probs: Record<string, number> = json.answers?.industry?.probabilities ?? {};
    const ranked = Object.entries(probs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, p]) => ({ id, p, label: INDUSTRY_BY_ID[id]?.label ?? id, sector: INDUSTRY_BY_ID[id]?.sector }));
    return NextResponse.json({ ranked, latencyMs: Math.round(performance.now() - t0), tokens: json.usage?.input_tokens ?? 0, model: json.model });
  } catch (err) {
    return NextResponse.json({ error: String((err as Error).message) }, { status: 502 });
  }
}
