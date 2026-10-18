import type { Entity, EventType, Extraction, Holding, ImpactVector, NewsEvent } from "../types";

// Offline extractor for custom headlines typed into the Stress Lab when no LLM key
// is configured. A transparent keyword lexicon, clearly labelled "heuristic" in the
// trace; the live LLM replaces it entirely when available.

interface Rule {
  re: RegExp;
  also?: RegExp;
  type: EventType;
  entity: Entity;
  step: string;
  vectors: (dir: "down" | "up") => ImpactVector[];
}

const v = (id: string, label: string, link: ImpactVector["link"], direction: ImpactVector["direction"], match: ImpactVector["match"], chain: string[]): ImpactVector => ({ id, label, link, direction, match, chain });

const RULES: Rule[] = [
  { re: /tariff|duty|duties/i, also: /chip|semiconductor|wafer|taiwan/i, type: "trade-policy", entity: { name: "Semiconductor tariff", type: "policy", role: "Trade measure" }, step: "Tariff language aimed at chips → foundry and TSMC-dependent designers.", vectors: () => [v("h-tw", "Taiwan fabs", "direct", "down", { tags: ["taiwan-ops"] }, ["Chip tariff", "{name} US-bound volume at risk"]), v("h-tsmc", "TSMC customers", "direct", "down", { tags: ["tsmc-wafers"] }, ["Wafer cost inflation", "{name} margin squeeze"])] },
  { re: /tariff|duty|duties/i, also: /pharma|drug|generic|medicine/i, type: "trade-policy", entity: { name: "Pharma tariff", type: "policy", role: "Trade measure" }, step: "Tariff on medicines → importers and generics exporters.", vectors: () => [v("h-gen", "Drug importers", "direct", "down", { tags: ["pharma-imports"] }, ["Import tariff on drugs", "{name} US margin pressure"])] },
  { re: /tariff|trade war|retaliat/i, type: "trade-policy", entity: { name: "Tariffs", type: "policy", role: "Trade measure" }, step: "Generic tariff language → China-linked supply chains and revenue.", vectors: () => [v("h-cn", "China supply chain", "indirect", "down", { tags: ["china-supply", "china-revenue"] }, ["Tariff escalation", "{name} cost / demand pressure"])] },
  { re: /export control|entity list|licen[cs]e requirement|chip ban/i, type: "export-control", entity: { name: "Export controls", type: "policy", role: "Restriction" }, step: "Export-control language → names tagged export-controls.", vectors: () => [v("h-ec", "Export-controlled sales", "direct", "down", { tags: ["export-controls"] }, ["New licence requirement", "{name} China sales at risk"])] },
  { re: /rare earth|magnet|dysprosium|neodymium/i, type: "geopolitical", entity: { name: "Rare earths", type: "commodity", role: "Critical mineral" }, step: "Rare-earth restriction → ex-China producers up, magnet users down.", vectors: () => [v("h-ree", "Ex-China REE supply", "direct", "up", { tags: ["rare-earth-supply"] }, ["Supply squeeze", "{name} pricing power"]), v("h-reu", "Magnet users", "indirect", "down", { tags: ["rare-earth-users"] }, ["Magnet shortage", "{name} delivery risk"])] },
  { re: /\bfda\b|complete response|crl|clinical hold|approv/i, type: "regulatory", entity: { name: "FDA", type: "org", role: "Regulator" }, step: "FDA decision → pipeline-dependent biotech.", vectors: (d) => [v("h-fda", "FDA pipeline", "direct", d, { tags: ["fda-pipeline"] }, ["Regulatory decision", "{name} pipeline value repriced"])] },
  { re: /medicare|\bcms\b|drug pric|negotiat/i, type: "regulatory", entity: { name: "Medicare", type: "org", role: "Payer" }, step: "Medicare pricing → drug-pricing exposed pharma.", vectors: () => [v("h-med", "Drug pricing", "direct", "down", { tags: ["drug-pricing"] }, ["Price negotiation", "{name} US net price falls"])] },
  { re: /rate hike|hawkish|no cuts|higher for longer|yields? (jump|surge|spike)/i, type: "monetary", entity: { name: "Interest rates", type: "index", role: "Discount rate" }, step: "Hawkish rates → long-duration growth de-rates.", vectors: () => [v("h-rate", "Long duration", "direct", "down", { tags: ["rates-sensitive"] }, ["Higher discount rate", "{name} multiple compresses"])] },
  { re: /rate cut|dovish|easing|stimulus|rrr/i, type: "monetary", entity: { name: "Monetary easing", type: "policy", role: "Liquidity" }, step: "Easing → rate-sensitive and China-demand names up.", vectors: () => [v("h-ease", "Easing beneficiaries", "indirect", "up", { tags: ["rates-sensitive", "china-demand"] }, ["Lower rates / more liquidity", "{name} re-rates"])] },
  { re: /earthquake|typhoon|flood|power outage|blackout/i, also: /taiwan|hsinchu|tsmc/i, type: "geopolitical", entity: { name: "Taiwan disruption", type: "country", role: "Event location" }, step: "Physical disruption in Taiwan → fabs and wafer-dependent designers.", vectors: () => [v("h-q", "Taiwan fabs", "direct", "down", { tags: ["taiwan-ops"] }, ["Fab disruption", "{name} output loss"]), v("h-q2", "Wafer customers", "indirect", "down", { tags: ["tsmc-wafers"] }, ["Shipment delays", "{name} timing risk"])] },
  { re: /lithium|spodumene/i, type: "commodity", entity: { name: "Lithium", type: "commodity", role: "Battery material" }, step: "Lithium price move → lithium producers.", vectors: (d) => [v("h-li", "Lithium producers", "direct", d, { industries: ["lithium"] }, ["Lithium price move", "{name} realised price"])] },
  { re: /copper|iron ore|infrastructure/i, type: "commodity", entity: { name: "Base metals", type: "commodity", role: "Industrial demand" }, step: "Base-metal demand → copper / iron-ore miners.", vectors: (d) => [v("h-cu", "Base-metal miners", "direct", d, { tags: ["china-demand"] }, ["Demand shift", "{name} price exposure"])] },
  { re: /contract|award/i, also: /defen[cs]e|pentagon|\bdod\b|army|navy|air force/i, type: "contract", entity: { name: "Department of Defense", type: "org", role: "Customer" }, step: "Defense contract news → DoD-dependent contractors.", vectors: (d) => [v("h-dod", "DoD contractors", "indirect", d, { tags: ["dod-contracts"] }, ["Contract action", "{name} backlog change"])] },
  { re: /consult|doge|federal (spending|budget)|shutdown/i, type: "fiscal", entity: { name: "US federal budget", type: "policy", role: "Funding" }, step: "Federal spending cuts → federal IT and consulting.", vectors: () => [v("h-fed", "Federal contractors", "direct", "down", { tags: ["us-federal-budget"] }, ["Spending cut", "{name} revenue at risk"])] },
  { re: /quantum|qubit/i, type: "corporate", entity: { name: "Quantum computing", type: "product", role: "Narrative" }, step: "Quantum headline → quantum basket moves together.", vectors: (d) => [v("h-qt", "Quantum basket", "indirect", d, { tags: ["quantum-hype"] }, ["Narrative shift", "{name} basket move"])] },
  { re: /\boil\b|brent|wti|opec|hormuz/i, type: "geopolitical", entity: { name: "Crude oil", type: "commodity", role: "Energy price" }, step: "Oil shock → producers up, duration down.", vectors: () => [v("h-oil", "Oil producers", "direct", "up", { tags: ["oil-price"] }, ["Oil price up", "{name} realised price"]), v("h-oil2", "Duration", "indirect", "down", { tags: ["rates-sensitive"] }, ["Inflation fear", "{name} de-rates"])] },
  { re: /h-?1b|visa/i, type: "fiscal", entity: { name: "H-1B visas", type: "policy", role: "Labour mobility" }, step: "Visa restriction → H-1B-reliant IT services.", vectors: () => [v("h-visa", "IT services", "direct", "down", { tags: ["visa-h1b"] }, ["Visa cost up", "{name} onsite margin"])] },
];

const NEG = /fall|slump|plunge|cut|ban|suspend|reject|delay|probe|halt|warn|seize|sanction|resign|downgrade|miss|recall|fraud|crash|block|denied|investigat|tariff|threat|strike/gi;
const POS = /award|approv|surge|rally|beat|stimulus|advantage|raise|wins?|upgrade|record|breakthrough|soar|jump|expand/gi;

export function heuristicExtract(event: NewsEvent, holdings: Holding[]): Extraction {
  const text = `${event.headline} ${event.body}`;
  const neg = (text.match(NEG) ?? []).length;
  const pos = (text.match(POS) ?? []).length;
  const sentiment = Math.max(-0.9, Math.min(0.9, (pos - neg) / Math.max(2, pos + neg)));
  const dir = sentiment >= 0.1 ? "up" : "down";

  const fired = RULES.filter((r) => r.re.test(text) && (!r.also || r.also.test(text)));
  // A single generic tariff rule is redundant when a specific tariff rule fired.
  const specificTariff = fired.some((r) => r.also && r.type === "trade-policy");
  const rules = fired.filter((r) => !(specificTariff && !r.also && r.type === "trade-policy"));

  const vectors = rules.flatMap((r) => r.vectors(dir));
  const named = holdings.filter((h) => new RegExp(`\\b(${escape(h.ticker.split(".")[0])}|${escape(h.name.split(" ")[0])})\\b`, "i").test(text));
  if (named.length) vectors.unshift(v("h-named", "Named companies", "direct", dir, { tickers: named.map((h) => h.ticker) }, ["Company named in headline", "{name} idiosyncratic repricing"]));

  return {
    summary: event.headline.slice(0, 140),
    eventType: rules[0]?.type ?? (named.length ? "corporate" : "sentiment"),
    sentiment,
    horizon: "days",
    entities: [...named.map((h) => ({ name: h.name, type: "org" as const, role: "Named in text" })), ...rules.map((r) => r.entity)].slice(0, 8),
    reasoning: [
      `Keyword heuristic (no LLM key configured): ${neg} negative / ${pos} positive cue words → sentiment ${sentiment.toFixed(2)}.`,
      ...(named.length ? [`Named holdings detected: ${named.map((h) => h.ticker).join(", ")}.`] : []),
      ...rules.map((r) => r.step),
      ...(vectors.length ? [] : ["No recognisable transmission channel into the book; nothing escalated."]),
    ],
    dependencies: rules.map((r) => ({ from: r.entity.name, to: r.vectors(dir)[0]?.label ?? "Portfolio", relation: r.type, order: 1 as const })),
    vectors,
  };
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
