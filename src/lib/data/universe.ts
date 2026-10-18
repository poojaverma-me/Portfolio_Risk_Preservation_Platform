import type { Holding, Security } from "../types";

// Securities the user can add from the search box. Figures are illustrative mock
// fixtures (USD-equivalent prices, rounded market caps), not live quotes.
export const UNIVERSE: Security[] = [
  // Semiconductors
  { ticker: "NVDA", name: "NVIDIA", exchange: "NASDAQ", country: "US", domain: "nvidia.com", sector: "semis", industry: "fabless", marketCapB: 4380, price: 179.6, beta: 1.72, vol30: 44, tags: ["tsmc-wafers", "ai-capex", "china-revenue", "export-controls"], blurb: "AI accelerators and networking; wafers fabbed at TSMC." },
  { ticker: "2330.TW", name: "Taiwan Semiconductor (TSMC)", exchange: "TWSE", country: "TW", domain: "tsmc.com", sector: "semis", industry: "foundry", marketCapB: 1210, price: 34.1, beta: 1.21, vol30: 31, tags: ["taiwan-ops", "ai-capex", "china-revenue", "export-controls"], blurb: "World's largest contract foundry; ~90% of leading-edge capacity." },
  { ticker: "ASML", name: "ASML Holding", exchange: "Euronext AMS", country: "NL", domain: "asml.com", sector: "semis", industry: "equipment", marketCapB: 312, price: 794.2, beta: 1.29, vol30: 34, tags: ["export-controls", "china-revenue", "ai-capex", "eu-regulation"], blurb: "Sole supplier of EUV lithography." },
  { ticker: "MU", name: "Micron Technology", exchange: "NASDAQ", country: "US", domain: "micron.com", sector: "semis", industry: "memory", marketCapB: 158, price: 141.3, beta: 1.48, vol30: 47, tags: ["memory-pricing", "ai-capex", "china-revenue", "export-controls"], blurb: "DRAM, NAND and HBM3E for AI accelerators." },
  { ticker: "005930.KS", name: "Samsung Electronics", exchange: "KRX", country: "KR", domain: "samsung.com", sector: "semis", industry: "memory", marketCapB: 362, price: 54.8, beta: 1.06, vol30: 29, tags: ["memory-pricing", "ai-capex", "china-revenue", "china-supply"], blurb: "Memory leader, second-largest foundry, handsets." },
  { ticker: "AMAT", name: "Applied Materials", exchange: "NASDAQ", country: "US", domain: "appliedmaterials.com", sector: "semis", industry: "equipment", marketCapB: 151, price: 187.9, beta: 1.52, vol30: 38, tags: ["export-controls", "china-revenue", "ai-capex"], blurb: "Deposition and etch tools; ~30% China revenue." },
  { ticker: "ACLS", name: "Axcelis Technologies", exchange: "NASDAQ", country: "US", domain: "axcelis.com", sector: "semis", industry: "equipment", marketCapB: 1.9, price: 59.4, beta: 1.81, vol30: 58, tags: ["export-controls", "china-revenue", "ev-demand"], blurb: "Ion-implant tools; heavy China mature-node exposure." },
  { ticker: "ON", name: "onsemi", exchange: "NASDAQ", country: "US", domain: "onsemi.com", sector: "semis", industry: "idm", marketCapB: 21, price: 50.2, beta: 1.62, vol30: 46, tags: ["ev-demand", "china-revenue"], blurb: "Silicon-carbide power chips for EVs." },
  // Healthcare
  { ticker: "LLY", name: "Eli Lilly", exchange: "NYSE", country: "US", domain: "lilly.com", sector: "health", industry: "pharma", marketCapB: 742, price: 826.0, beta: 0.44, vol30: 27, tags: ["drug-pricing", "medicare", "glp1"], blurb: "GLP-1 leader (Mounjaro, Zepbound)." },
  { ticker: "NVO", name: "Novo Nordisk", exchange: "NYSE", country: "DK", domain: "novonordisk.com", sector: "health", industry: "pharma", marketCapB: 248, price: 55.6, beta: 0.52, vol30: 36, tags: ["drug-pricing", "medicare", "glp1", "pharma-imports"], blurb: "Ozempic / Wegovy maker." },
  { ticker: "UNH", name: "UnitedHealth Group", exchange: "NYSE", country: "US", domain: "unitedhealthgroup.com", sector: "health", industry: "managed", marketCapB: 318, price: 351.2, beta: 0.58, vol30: 33, tags: ["medicare", "us-federal-budget"], blurb: "Largest Medicare Advantage insurer." },
  { ticker: "MRNA", name: "Moderna", exchange: "NASDAQ", country: "US", domain: "modernatx.com", sector: "health", industry: "biotech", marketCapB: 10.6, price: 27.4, beta: 1.38, vol30: 61, tags: ["fda-pipeline", "vaccine-policy"], blurb: "mRNA vaccines; pipeline-dependent." },
  { ticker: "VKTX", name: "Viking Therapeutics", exchange: "NASDAQ", country: "US", domain: "vikingtherapeutics.com", sector: "health", industry: "biotech", marketCapB: 3.4, price: 30.1, beta: 1.12, vol30: 72, tags: ["fda-pipeline", "glp1"], blurb: "Clinical-stage oral GLP-1." },
  { ticker: "ISRG", name: "Intuitive Surgical", exchange: "NASDAQ", country: "US", domain: "intuitive.com", sector: "health", industry: "medtech", marketCapB: 178, price: 498.0, beta: 1.08, vol30: 29, tags: ["hospital-capex", "china-revenue"], blurb: "da Vinci surgical robots." },
  { ticker: "SUNPHARMA.NS", name: "Sun Pharmaceutical", exchange: "NSE", country: "IN", domain: "sunpharma.com", sector: "health", industry: "generics", marketCapB: 46, price: 19.2, beta: 0.61, vol30: 24, tags: ["pharma-imports", "us-generics", "usd-sensitive"], blurb: "India's largest pharma; ~30% US generics." },
  // Minerals
  { ticker: "MP", name: "MP Materials", exchange: "NYSE", country: "US", domain: "mpmaterials.com", sector: "minerals", industry: "rare-earths", marketCapB: 9.1, price: 51.7, beta: 1.94, vol30: 69, tags: ["rare-earth-supply", "dod-contracts", "china-processing"], blurb: "Mountain Pass rare earths; DoD magnet offtake." },
  { ticker: "LYC.AX", name: "Lynas Rare Earths", exchange: "ASX", country: "AU", domain: "lynasrareearths.com", sector: "minerals", industry: "rare-earths", marketCapB: 8.3, price: 8.9, beta: 1.41, vol30: 52, tags: ["rare-earth-supply", "china-processing", "dod-contracts"], blurb: "Largest rare-earth producer outside China." },
  { ticker: "ALB", name: "Albemarle", exchange: "NYSE", country: "US", domain: "albemarle.com", sector: "minerals", industry: "lithium", marketCapB: 10.4, price: 88.3, beta: 1.58, vol30: 54, tags: ["ev-demand", "battery-supply", "commodity-cycle"], blurb: "Lithium brine and hard-rock refining." },
  { ticker: "PLS.AX", name: "Pilbara Minerals", exchange: "ASX", country: "AU", domain: "pls.com", sector: "minerals", industry: "lithium", marketCapB: 4.6, price: 1.52, beta: 1.77, vol30: 63, tags: ["ev-demand", "battery-supply", "commodity-cycle", "china-demand"], blurb: "Spodumene miner selling into Chinese converters." },
  { ticker: "FCX", name: "Freeport-McMoRan", exchange: "NYSE", country: "US", domain: "fcx.com", sector: "minerals", industry: "copper", marketCapB: 63, price: 43.9, beta: 1.66, vol30: 39, tags: ["china-demand", "commodity-cycle"], blurb: "Copper and gold; Grasberg, Americas." },
  { ticker: "VALE3.SA", name: "Vale", exchange: "B3", country: "BR", domain: "vale.com", sector: "minerals", industry: "iron-ore", marketCapB: 44, price: 10.3, beta: 1.12, vol30: 31, tags: ["china-demand", "commodity-cycle", "brazil-ops"], blurb: "Iron ore and nickel; Minas Gerais operations." },
  { ticker: "CCJ", name: "Cameco", exchange: "NYSE", country: "CA", domain: "cameco.com", sector: "minerals", industry: "uranium", marketCapB: 34, price: 78.4, beta: 1.09, vol30: 44, tags: ["nuclear-policy", "commodity-cycle"], blurb: "Uranium mining and conversion." },
  { ticker: "NEM", name: "Newmont", exchange: "NYSE", country: "US", domain: "newmont.com", sector: "minerals", industry: "gold", marketCapB: 92, price: 83.1, beta: 0.47, vol30: 33, tags: ["gold-haven", "rates-sensitive"], blurb: "World's largest gold miner." },
  // Quantum
  { ticker: "IONQ", name: "IonQ", exchange: "NYSE", country: "US", domain: "ionq.com", sector: "quantum", industry: "q-hardware", marketCapB: 8.6, price: 41.2, beta: 2.31, vol30: 92, tags: ["quantum-hype", "retail-flow", "rates-sensitive"], blurb: "Trapped-ion quantum computers." },
  { ticker: "RGTI", name: "Rigetti Computing", exchange: "NASDAQ", country: "US", domain: "rigetti.com", sector: "quantum", industry: "q-hardware", marketCapB: 4.9, price: 15.8, beta: 2.58, vol30: 118, tags: ["quantum-hype", "retail-flow", "rates-sensitive", "high-short-interest"], blurb: "Superconducting qubits." },
  { ticker: "QBTS", name: "D-Wave Quantum", exchange: "NYSE", country: "US", domain: "dwavequantum.com", sector: "quantum", industry: "q-annealing", marketCapB: 5.7, price: 18.9, beta: 2.44, vol30: 104, tags: ["quantum-hype", "retail-flow", "rates-sensitive"], blurb: "Quantum annealing systems." },
  { ticker: "QUBT", name: "Quantum Computing Inc.", exchange: "NASDAQ", country: "US", domain: "quantumcomputinginc.com", sector: "quantum", industry: "q-annealing", marketCapB: 1.6, price: 11.4, beta: 2.71, vol30: 131, tags: ["quantum-hype", "retail-flow", "rates-sensitive", "high-short-interest"], blurb: "Photonic quantum hardware; small cap." },
  // Government contractors
  { ticker: "LMT", name: "Lockheed Martin", exchange: "NYSE", country: "US", domain: "lockheedmartin.com", sector: "govcon", industry: "defense", marketCapB: 112, price: 478.0, beta: 0.41, vol30: 21, tags: ["dod-contracts", "us-federal-budget", "rare-earth-users"], blurb: "F-35, missiles, space." },
  { ticker: "PLTR", name: "Palantir Technologies", exchange: "NASDAQ", country: "US", domain: "palantir.com", sector: "govcon", industry: "gov-data", marketCapB: 402, price: 170.1, beta: 2.12, vol30: 57, tags: ["dod-contracts", "us-federal-budget", "retail-flow", "rates-sensitive"], blurb: "Data platforms for defense and enterprise." },
  { ticker: "BAH", name: "Booz Allen Hamilton", exchange: "NYSE", country: "US", domain: "boozallen.com", sector: "govcon", industry: "fed-it", marketCapB: 13.2, price: 104.6, beta: 0.66, vol30: 34, tags: ["us-federal-budget", "consulting-cuts"], blurb: "Federal consulting; ~98% government revenue." },
  { ticker: "LDOS", name: "Leidos", exchange: "NYSE", country: "US", domain: "leidos.com", sector: "govcon", industry: "fed-it", marketCapB: 21, price: 160.3, beta: 0.71, vol30: 26, tags: ["us-federal-budget", "consulting-cuts", "dod-contracts"], blurb: "Federal IT, health and defense systems." },
  { ticker: "RKLB", name: "Rocket Lab", exchange: "NASDAQ", country: "US", domain: "rocketlabusa.com", sector: "govcon", industry: "space", marketCapB: 22, price: 46.3, beta: 2.18, vol30: 78, tags: ["dod-contracts", "nasa", "rates-sensitive", "retail-flow", "rare-earth-users"], blurb: "Electron/Neutron launch, satellite components." },
  { ticker: "RHM.DE", name: "Rheinmetall", exchange: "XETRA", country: "DE", domain: "rheinmetall.com", sector: "govcon", industry: "defense", marketCapB: 88, price: 1920.0, beta: 0.84, vol30: 41, tags: ["eu-defense", "rare-earth-users"], blurb: "European munitions and armoured vehicles." },
  // Energy
  { ticker: "XOM", name: "Exxon Mobil", exchange: "NYSE", country: "US", domain: "exxonmobil.com", sector: "energy", industry: "oil", marketCapB: 471, price: 111.2, beta: 0.52, vol30: 22, tags: ["oil-price", "middle-east"], blurb: "Integrated oil major." },
  { ticker: "CEG", name: "Constellation Energy", exchange: "NASDAQ", country: "US", domain: "constellationenergy.com", sector: "energy", industry: "power", marketCapB: 104, price: 330.5, beta: 1.21, vol30: 43, tags: ["ai-capex", "nuclear-policy", "rates-sensitive"], blurb: "Largest US nuclear fleet; data-centre PPAs." },
  // Tech
  { ticker: "MSFT", name: "Microsoft", exchange: "NASDAQ", country: "US", domain: "microsoft.com", sector: "tech", industry: "cloud", marketCapB: 3810, price: 512.4, beta: 0.93, vol30: 22, tags: ["ai-capex", "cloud-capex"], blurb: "Azure, Office, OpenAI partnership." },
  { ticker: "AAPL", name: "Apple", exchange: "NASDAQ", country: "US", domain: "apple.com", sector: "tech", industry: "hardware", marketCapB: 3640, price: 245.8, beta: 1.04, vol30: 24, tags: ["china-supply", "china-revenue", "consumer-demand", "tsmc-wafers"], blurb: "iPhone; assembly concentrated in China." },
  { ticker: "INFY.NS", name: "Infosys", exchange: "NSE", country: "IN", domain: "infosys.com", sector: "tech", industry: "it-services", marketCapB: 72, price: 17.4, beta: 0.79, vol30: 23, tags: ["india-it", "visa-h1b", "usd-sensitive"], blurb: "Indian IT services; ~60% North America revenue." },
  { ticker: "TSLA", name: "Tesla", exchange: "NASDAQ", country: "US", domain: "tesla.com", sector: "tech", industry: "ev", marketCapB: 1390, price: 431.0, beta: 2.04, vol30: 58, tags: ["ev-demand", "china-supply", "retail-flow", "rare-earth-users"], blurb: "EVs, energy storage, autonomy." },
  // Financials
  { ticker: "JPM", name: "JPMorgan Chase", exchange: "NYSE", country: "US", domain: "jpmorganchase.com", sector: "financials", industry: "banks", marketCapB: 842, price: 305.4, beta: 1.03, vol30: 20, tags: ["rates-sensitive", "credit-cycle"], blurb: "Largest US bank." },
  { ticker: "HDFCBANK.NS", name: "HDFC Bank", exchange: "NSE", country: "IN", domain: "hdfcbank.com", sector: "financials", industry: "banks", marketCapB: 171, price: 22.6, beta: 0.82, vol30: 19, tags: ["rates-sensitive", "credit-cycle"], blurb: "India's largest private bank." },
];

export const UNIVERSE_BY_TICKER = Object.fromEntries(UNIVERSE.map((s) => [s.ticker, s]));

// Default book: "Meridian Global Preservation Fund", ~USD 2.4bn across 22 names.
const DEFAULT_POSITIONS: [string, number][] = [
  ["NVDA", 1_150_000],
  ["2330.TW", 5_600_000],
  ["ASML", 160_000],
  ["MU", 720_000],
  ["005930.KS", 1_900_000],
  ["ACLS", 520_000],
  ["LLY", 150_000],
  ["UNH", 260_000],
  ["MRNA", 1_400_000],
  ["SUNPHARMA.NS", 3_100_000],
  ["MP", 1_050_000],
  ["LYC.AX", 4_400_000],
  ["ALB", 480_000],
  ["FCX", 1_700_000],
  ["VALE3.SA", 5_200_000],
  ["IONQ", 980_000],
  ["RGTI", 1_850_000],
  ["LMT", 205_000],
  ["PLTR", 470_000],
  ["BAH", 610_000],
  ["RKLB", 1_250_000],
  ["CEG", 230_000],
];

export function defaultHoldings(): Holding[] {
  return DEFAULT_POSITIONS.map(([t, shares]) => ({ ...UNIVERSE_BY_TICKER[t], id: t, shares }));
}

export const FUND = {
  name: "Meridian Global Preservation Fund",
  manager: "Eleanor Hayes, CIO",
  mandate: "Capital preservation first. Max single-event drawdown budget: 1.5% of NAV.",
  drawdownBudgetPct: 1.5,
};
