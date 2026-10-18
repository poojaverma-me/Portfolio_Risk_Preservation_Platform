import type { CapTier, JevClass, Security } from "../types";
import { INDUSTRY_BY_ID, SECTOR_BY_ID } from "../data/taxonomy";

// JEV (J-E-V) classification: market-cap tier × sector × granular industry domain.
// Tier cut-offs follow the common institutional convention (USD).
export const CAP_TIERS: { tier: CapTier; label: string; min: number; letter: string }[] = [
  { tier: "large", label: "Large-cap (> $10B)", min: 10, letter: "L" },
  { tier: "mid", label: "Mid-cap ($2B–$10B)", min: 2, letter: "M" },
  { tier: "small", label: "Small-cap (< $2B)", min: 0, letter: "S" },
];

const EM = new Set(["TW", "KR", "IN", "BR", "CN", "ZA", "MX", "ID", "TH", "MY", "PH", "CL", "PE", "SA", "AE", "TR"]);

export function capTier(marketCapB: number) {
  return CAP_TIERS.find((t) => marketCapB >= t.min) ?? CAP_TIERS[2];
}

export function classify(s: Pick<Security, "marketCapB" | "sector" | "industry" | "country">): JevClass {
  const t = capTier(s.marketCapB);
  const sector = SECTOR_BY_ID[s.sector];
  const ind = INDUSTRY_BY_ID[s.industry];
  return {
    capTier: t.tier,
    capLabel: t.label,
    sectorCode: sector?.code ?? "UNCL",
    industryCode: ind?.code ?? `${sector?.code ?? "UNCL"}.GEN`,
    industryLabel: ind?.label ?? "Unclassified",
    code: `JEV-${t.letter}-${ind?.code ?? "UNCL"}`,
    region: EM.has(s.country) ? "EM" : "DM",
  };
}
