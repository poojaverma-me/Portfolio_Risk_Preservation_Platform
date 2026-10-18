import type { Holding, ImpactMatch, ImpactVector, ScreenHit } from "../types";

// Stage 2: match the LLM's impact vectors against the book. Deterministic and
// cheap, so it reruns instantly whenever holdings change.

/**
 * A holding matches a vector when its ticker is listed, or when it satisfies every
 * other dimension the vector specifies (any value within a dimension). Returns the
 * reasons, or [] for no match.
 */
export function matchReasons(h: Holding, m: ImpactMatch): string[] {
  if (m.tickers?.includes(h.ticker)) return [`ticker ${h.ticker}`];
  const dims: [string[] | undefined, (x: string) => boolean, string][] = [
    [m.sectors, (x) => x === h.sector, "sector"],
    [m.industries, (x) => x === h.industry, "industry"],
    [m.countries, (x) => x === h.country, "country"],
    [m.tags, (x) => h.tags.includes(x), "tag"],
  ];
  const r: string[] = [];
  let specified = 0;
  for (const [vals, test, name] of dims) {
    if (!vals?.length) continue;
    specified++;
    const hit = vals.filter(test);
    if (!hit.length) return [];
    r.push(...hit.map((x) => `${name} ${x}`));
  }
  return specified ? r : [];
}

export function fillChain(chain: string[], h: Pick<Holding, "name" | "ticker">) {
  return chain.map((c) => c.replaceAll("{name}", h.name).replaceAll("{ticker}", h.ticker));
}

export function screen(holdings: Holding[], vectors: ImpactVector[]): { hits: ScreenHit[]; out: number } {
  const hits: ScreenHit[] = [];
  for (const h of holdings) {
    const matched = vectors.filter((v) => matchReasons(h, v.match).length > 0);
    if (!matched.length) continue;
    // Strongest link wins; ties go to the vector listed first (the LLM orders by importance).
    const lead = matched.find((v) => v.link === "direct") ?? matched[0];
    hits.push({
      ticker: h.ticker,
      vectorIds: matched.map((v) => v.id),
      link: lead.link,
      direction: lead.direction,
      chain: fillChain(lead.chain, h),
    });
  }
  return { hits, out: holdings.length - hits.length };
}
