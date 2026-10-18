import type { SectorId } from "../types";

// The JEV (J-E-V) classification taxonomy: sector → granular industry domain.
// Codes are stable identifiers that show up in the traceability console and in the
// Jev classification request.

export interface Industry {
  id: string;
  code: string;
  label: string;
  hint: string; // used as the Jev choice criterion when classifying custom holdings
  tags: string[]; // default exposure tags for a new holding in this industry
}

export interface Sector {
  id: SectorId;
  code: string;
  label: string;
  color: string; // categorical slot (dark-surface step), fixed order
  industries: Industry[];
}

export const SECTORS: Sector[] = [
  {
    id: "semis",
    code: "SEMI",
    label: "Semiconductors",
    color: "#3987e5",
    industries: [
      { id: "foundry", code: "SEMI.FDRY", label: "Foundry", hint: "contract chip manufacturing for other companies", tags: ["taiwan-ops", "ai-capex", "china-revenue"] },
      { id: "fabless", code: "SEMI.FBLS", label: "Fabless design", hint: "designs chips (GPUs, CPUs, SoCs) but outsources fabrication", tags: ["tsmc-wafers", "ai-capex", "china-revenue", "export-controls"] },
      { id: "equipment", code: "SEMI.EQPT", label: "Wafer-fab equipment", hint: "lithography, deposition, etch or implant tools sold to fabs", tags: ["export-controls", "china-revenue", "ai-capex"] },
      { id: "memory", code: "SEMI.MEM", label: "Memory (DRAM / HBM / NAND)", hint: "memory chips including high-bandwidth memory", tags: ["memory-pricing", "ai-capex", "china-revenue"] },
      { id: "idm", code: "SEMI.IDM", label: "Analog & power IDM", hint: "integrated device makers for analog, power and auto chips", tags: ["ev-demand", "china-revenue"] },
    ],
  },
  {
    id: "health",
    code: "HLTH",
    label: "Healthcare",
    color: "#d95926",
    industries: [
      { id: "pharma", code: "HLTH.PHRM", label: "Large pharma", hint: "branded prescription drug makers", tags: ["drug-pricing", "medicare"] },
      { id: "biotech", code: "HLTH.BIO", label: "Biotech", hint: "clinical-stage or commercial biotechnology, vaccines, gene therapy", tags: ["fda-pipeline"] },
      { id: "generics", code: "HLTH.GEN", label: "Generics & API", hint: "generic drugs and active pharmaceutical ingredients", tags: ["pharma-imports", "us-generics"] },
      { id: "medtech", code: "HLTH.MDTC", label: "Medical devices", hint: "surgical robots, implants, diagnostics hardware", tags: ["hospital-capex"] },
      { id: "managed", code: "HLTH.MGDC", label: "Managed care", hint: "health insurers and Medicare Advantage plans", tags: ["medicare", "us-federal-budget"] },
    ],
  },
  {
    id: "minerals",
    code: "MIN",
    label: "Minerals & Mining",
    color: "#199e70",
    industries: [
      { id: "lithium", code: "MIN.LITH", label: "Lithium", hint: "lithium brine, spodumene and refining", tags: ["ev-demand", "battery-supply", "commodity-cycle"] },
      { id: "rare-earths", code: "MIN.REE", label: "Rare earths & magnets", hint: "rare-earth mining, separation and permanent magnets", tags: ["rare-earth-supply", "china-processing", "dod-contracts"] },
      { id: "copper", code: "MIN.CU", label: "Copper", hint: "copper mining and smelting", tags: ["china-demand", "commodity-cycle"] },
      { id: "iron-ore", code: "MIN.FE", label: "Iron ore & base metals", hint: "iron ore, nickel and diversified base metals", tags: ["china-demand", "commodity-cycle"] },
      { id: "uranium", code: "MIN.U", label: "Uranium", hint: "uranium mining and nuclear fuel", tags: ["nuclear-policy", "commodity-cycle"] },
      { id: "gold", code: "MIN.AU", label: "Gold & precious", hint: "gold and silver miners", tags: ["gold-haven", "rates-sensitive"] },
    ],
  },
  {
    id: "quantum",
    code: "QNTM",
    label: "Quantum Computing",
    color: "#c98500",
    industries: [
      { id: "q-hardware", code: "QNTM.HW", label: "Quantum hardware", hint: "trapped-ion, superconducting or photonic quantum computers", tags: ["quantum-hype", "retail-flow", "rates-sensitive"] },
      { id: "q-annealing", code: "QNTM.ANL", label: "Annealing & quantum software", hint: "quantum annealers, quantum software and cloud access", tags: ["quantum-hype", "retail-flow", "rates-sensitive"] },
    ],
  },
  {
    id: "govcon",
    code: "GOV",
    label: "Government Contractors",
    color: "#d55181",
    industries: [
      { id: "defense", code: "GOV.DEF", label: "Defense primes", hint: "aircraft, missiles, ships and weapons systems for militaries", tags: ["dod-contracts", "us-federal-budget", "rare-earth-users"] },
      { id: "fed-it", code: "GOV.FIT", label: "Federal IT & consulting", hint: "consulting, IT modernisation and services for federal agencies", tags: ["us-federal-budget", "consulting-cuts"] },
      { id: "space", code: "GOV.SPC", label: "Space & launch", hint: "rockets, satellites and space systems", tags: ["dod-contracts", "nasa", "rates-sensitive", "rare-earth-users"] },
      { id: "gov-data", code: "GOV.DATA", label: "Defense software & data", hint: "data analytics and AI software for defense and intelligence", tags: ["dod-contracts", "us-federal-budget", "retail-flow"] },
    ],
  },
  {
    id: "energy",
    code: "NRG",
    label: "Energy",
    color: "#008300",
    industries: [
      { id: "oil", code: "NRG.OIL", label: "Integrated oil & gas", hint: "oil and gas exploration, production and refining", tags: ["oil-price", "middle-east"] },
      { id: "power", code: "NRG.PWR", label: "Power & nuclear utilities", hint: "electric utilities and nuclear generation", tags: ["ai-capex", "nuclear-policy", "rates-sensitive"] },
    ],
  },
  {
    id: "tech",
    code: "TECH",
    label: "Technology & Software",
    color: "#9085e9",
    industries: [
      { id: "cloud", code: "TECH.CLD", label: "Hyperscale cloud & software", hint: "cloud platforms and enterprise software", tags: ["ai-capex", "cloud-capex"] },
      { id: "hardware", code: "TECH.HW", label: "Consumer hardware", hint: "smartphones, PCs and consumer electronics", tags: ["china-supply", "china-revenue", "consumer-demand"] },
      { id: "it-services", code: "TECH.ITS", label: "IT services & outsourcing", hint: "offshore IT services and outsourcing", tags: ["india-it", "visa-h1b", "usd-sensitive"] },
      { id: "ev", code: "TECH.EV", label: "EV & autonomy", hint: "electric vehicles and autonomous driving", tags: ["ev-demand", "china-supply", "retail-flow", "rare-earth-users"] },
    ],
  },
  {
    id: "financials",
    code: "FIN",
    label: "Financials",
    color: "#e66767",
    industries: [
      { id: "banks", code: "FIN.BNK", label: "Banks", hint: "commercial and investment banks", tags: ["rates-sensitive", "credit-cycle"] },
      { id: "exchanges", code: "FIN.EXCH", label: "Exchanges & data", hint: "stock exchanges and market data", tags: ["volatility-beneficiary"] },
    ],
  },
];

export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<SectorId, Sector>;

export const INDUSTRY_BY_ID: Record<string, Industry & { sector: SectorId }> = Object.fromEntries(
  SECTORS.flatMap((s) => s.industries.map((i) => [i.id, { ...i, sector: s.id }]))
);

// Exposure-tag vocabulary. The live LLM is told to target holdings with these tags,
// which keeps its output matchable against any holding the user adds later.
export const TAGS: Record<string, string> = {
  "tsmc-wafers": "Depends on TSMC for leading-edge wafers",
  "taiwan-ops": "Material operations or fabs in Taiwan",
  "china-revenue": "Meaningful revenue from mainland China",
  "china-supply": "Supply chain concentrated in China",
  "china-demand": "Demand driven by Chinese construction / industry",
  "china-processing": "Competes with or relies on Chinese mineral processing",
  "export-controls": "Sales subject to US / allied export controls",
  "ai-capex": "Revenue tied to AI data-centre capex",
  "cloud-capex": "Large spender on cloud / AI infrastructure",
  "memory-pricing": "Earnings swing with DRAM / HBM pricing",
  "ev-demand": "Exposed to electric-vehicle demand",
  "battery-supply": "Battery-materials supply chain",
  "rare-earth-supply": "Non-Chinese rare-earth supply (benefits from Chinese restrictions)",
  "rare-earth-users": "Consumes rare-earth magnets in products",
  "dod-contracts": "Significant US Department of Defense revenue",
  "us-federal-budget": "Revenue depends on US federal appropriations",
  "consulting-cuts": "Exposed to federal consulting contract cancellations",
  nasa: "NASA programme revenue",
  medicare: "Exposed to Medicare reimbursement / negotiation",
  "drug-pricing": "Exposed to US drug-price regulation",
  "fda-pipeline": "Value concentrated in FDA-pending products",
  "pharma-imports": "Exports drugs into the US",
  "us-generics": "Large share of US generics market",
  "hospital-capex": "Sells capital equipment to hospitals",
  "commodity-cycle": "Earnings follow commodity prices",
  "gold-haven": "Benefits from safe-haven flows",
  "nuclear-policy": "Exposed to nuclear-energy policy",
  "oil-price": "Earnings follow crude prices",
  "middle-east": "Operations or supply routes in the Middle East",
  "quantum-hype": "Valuation driven by quantum-computing narrative",
  "retail-flow": "High retail ownership / options activity",
  "rates-sensitive": "Long-duration valuation, sensitive to interest rates",
  "credit-cycle": "Exposed to loan losses",
  "india-it": "Indian IT-services exporter",
  "visa-h1b": "Relies on US H-1B work visas",
  "usd-sensitive": "Earnings swing with the US dollar",
  "consumer-demand": "Exposed to consumer spending",
  "volatility-beneficiary": "Benefits from higher trading volumes",
  "eu-regulation": "Subject to EU / Dutch government licensing",
  "brazil-ops": "Major operations in Brazil",
  glp1: "GLP-1 obesity / diabetes franchise",
  "vaccine-policy": "Exposed to vaccine policy and recommendations",
  "high-short-interest": "Short interest above 15% of float",
  "eu-defense": "European defense budgets",
};
