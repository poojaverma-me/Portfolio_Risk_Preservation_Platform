import type { Extraction, ImpactVector } from "../types";

// Coerce model JSON into a safe Extraction; drops anything malformed rather than failing.
const EVENT_TYPES = ["trade-policy", "export-control", "regulatory", "monetary", "geopolitical", "corporate", "commodity", "contract", "fiscal", "sentiment"] as const;
const HORIZONS = ["intraday", "days", "weeks", "months"] as const;

const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").slice(0, 12) : undefined);
const pick = <T extends string>(x: unknown, allowed: readonly T[], d: T): T => (allowed.includes(x as T) ? (x as T) : d);

export function sanitizeExtraction(raw: Record<string, unknown>): Extraction {
  const vectors: ImpactVector[] = (Array.isArray(raw.vectors) ? raw.vectors : []).slice(0, 8).flatMap((v: Record<string, unknown>, i: number) => {
    const m = (v?.match ?? {}) as Record<string, unknown>;
    const match = { tickers: strs(m.tickers), sectors: strs(m.sectors) as ImpactVector["match"]["sectors"], industries: strs(m.industries), countries: strs(m.countries), tags: strs(m.tags) };
    if (!Object.values(match).some((a) => a?.length)) return [];
    return [
      {
        id: typeof v.id === "string" ? v.id : `v${i}`,
        label: typeof v.label === "string" ? v.label : `Vector ${i + 1}`,
        link: v.link === "direct" ? "direct" : "indirect",
        direction: v.direction === "up" ? "up" : "down",
        match,
        chain: strs(v.chain) ?? [],
      } satisfies ImpactVector,
    ];
  });
  return {
    summary: String(raw.summary ?? "").slice(0, 300),
    eventType: pick(raw.eventType, EVENT_TYPES, "sentiment"),
    sentiment: Math.max(-1, Math.min(1, Number(raw.sentiment) || 0)),
    horizon: pick(raw.horizon, HORIZONS, "days"),
    entities: (Array.isArray(raw.entities) ? raw.entities : []).slice(0, 10).map((e: Record<string, string>) => ({ name: String(e.name ?? ""), type: e.type as Extraction["entities"][number]["type"], role: String(e.role ?? "") })),
    reasoning: strs(raw.reasoning) ?? [],
    dependencies: (Array.isArray(raw.dependencies) ? raw.dependencies : []).slice(0, 10).map((d: Record<string, unknown>) => ({ from: String(d.from ?? ""), to: String(d.to ?? ""), relation: String(d.relation ?? ""), order: d.order === 1 ? 1 : 2 })),
    vectors,
  };
}
