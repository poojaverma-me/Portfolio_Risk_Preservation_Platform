"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Search, Sparkles, Briefcase, RotateCcw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { useBook } from "@/lib/hooks";
import { UNIVERSE, FUND } from "@/lib/data/universe";
import { SECTORS, SECTOR_BY_ID, INDUSTRY_BY_ID } from "@/lib/data/taxonomy";
import { CAP_TIERS, classify } from "@/lib/jev/classify";
import { usd, pct } from "@/lib/risk";
import type { Holding, SectorId } from "@/lib/types";
import { BookTreemap } from "@/components/charts/Charts";
import { Btn, Logo, PanelHead, ThreatBadge } from "@/components/ui/bits";

export default function Portfolio() {
  const { holdings, addHolding, updateHolding, removeHolding, toast, reset } = useStore(
    useShallow((s) => ({ holdings: s.holdings, addHolding: s.addHolding, updateHolding: s.updateHolding, removeHolding: s.removeHolding, toast: s.toast, reset: s.reset }))
  );
  const book = useBook();
  const nav = book.nav || 1;
  const sorted = [...holdings].sort((a, b) => b.shares * b.price - a.shares * a.price);

  const bySector = SECTORS.map((s) => ({ s, v: holdings.filter((h) => h.sector === s.id).reduce((t, h) => t + h.shares * h.price, 0) })).filter((x) => x.v > 0);
  const byTier = CAP_TIERS.map((t) => ({ t, v: holdings.filter((h) => classify(h).capTier === t.tier).reduce((s, h) => s + h.shares * h.price, 0) }));
  const em = holdings.filter((h) => classify(h).region === "EM").reduce((s, h) => s + h.shares * h.price, 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em]">
            <Briefcase size={16} className="text-accent" /> Portfolio · JEV classification
          </h1>
          <p className="text-[12.5px] text-mute">
            {FUND.name}. {FUND.mandate}
          </p>
        </div>
        <Btn
          tone="ghost"
          onClick={() => {
            if (confirm("Reset the demo book, alerts and events?")) {
              reset();
              toast("Demo reset", "info");
            }
          }}
        >
          <RotateCcw size={13} /> Reset demo
        </Btn>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-4">
          <div className="label mb-2">Sector exposure</div>
          {bySector.map(({ s, v }) => (
            <Row key={s.id} label={s.label} value={v / nav} color="var(--color-seq3)" amount={v} />
          ))}
        </section>
        <section className="panel p-4">
          <div className="label mb-2">Market-cap tier (JEV)</div>
          {byTier.map(({ t, v }, i) => (
            <Row key={t.tier} label={t.label} value={v / nav} color={["var(--color-seq4)", "var(--color-seq3)", "var(--color-seq2)"][i]} amount={v} />
          ))}
          <div className="label mb-2 mt-4">Region</div>
          <Row label="Developed markets" value={(nav - em) / nav} color="var(--color-seq4)" amount={nav - em} />
          <Row label="Emerging markets" value={em / nav} color="var(--color-seq2)" amount={em} />
        </section>
        <section className="panel overflow-hidden">
          <PanelHead title="Book map" sub="colour = worst open threat" />
          <div className="p-2">
            <BookTreemap holdings={holdings} threatOf={(t) => book.worstByTicker[t]?.threat} />
          </div>
        </section>
      </div>

      <AddHolding held={new Set(holdings.map((h) => h.ticker))} onAdd={(h) => { addHolding(h); toast(`Added ${h.ticker} · ${classify(h).code}. Open events will be re-scored.`, "good"); }} />

      <section className="panel overflow-hidden">
        <PanelHead title="Holdings" sub={`${holdings.length} positions · ${usd(nav, 2)}`} right={<span className="text-[11px] text-mute">edit shares or domain inline; risk recalculates immediately</span>} />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left">
                {["Holding", "Exchange", "JEV code", "Cap tier", "Domain", "Shares", "Price", "Value", "Weight", "Open threat", ""].map((h) => (
                  <th key={h} className="label whitespace-nowrap border-b border-line px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const c = classify(h);
                const v = h.shares * h.price;
                const w = book.worstByTicker[h.ticker];
                return (
                  <tr key={h.id} className="border-b border-line/60 hover:bg-raise/40">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Logo domain={h.domain} label={h.ticker} size={18} />
                        <div className="leading-tight">
                          <div className="num font-semibold">{h.ticker}</div>
                          <div className="max-w-[170px] truncate text-[10.5px] text-mute">{h.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-ink2">
                      {h.exchange} <span className="text-mute">· {h.country}</span>
                    </td>
                    <td className="num whitespace-nowrap px-3 py-1.5 text-jev">{c.code}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 capitalize text-ink2">{c.capTier}</td>
                    <td className="px-3 py-1.5">
                      <select
                        value={h.industry}
                        onChange={(e) => {
                          const ind = INDUSTRY_BY_ID[e.target.value];
                          updateHolding(h.id, { industry: ind.id, sector: ind.sector, tags: Array.from(new Set([...ind.tags, ...h.tags.filter((t) => !INDUSTRY_BY_ID[h.industry]?.tags.includes(t))])) });
                        }}
                        className="h-7 max-w-[190px] rounded border border-line bg-raise px-1.5 text-[11.5px] text-ink2 outline-none"
                      >
                        {SECTORS.map((s) => (
                          <optgroup key={s.id} label={s.label}>
                            {s.industries.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={h.shares}
                        onChange={(e) => updateHolding(h.id, { shares: Math.max(0, Number(e.target.value) || 0) })}
                        className="num h-7 w-[110px] rounded border border-line bg-raise px-2 text-right text-[11.5px] outline-none focus:border-accent/60"
                      />
                    </td>
                    <td className="num px-3 py-1.5 text-ink2">${h.price.toLocaleString()}</td>
                    <td className="num px-3 py-1.5">{usd(v)}</td>
                    <td className="num px-3 py-1.5 text-ink2">{pct(v / nav, 1)}</td>
                    <td className="px-3 py-1.5">{w ? <ThreatBadge threat={w.threat} size="xs" /> : <span className="text-[11px] text-mute">—</span>}</td>
                    <td className="px-3 py-1.5">
                      <button onClick={() => { removeHolding(h.id); toast(`Removed ${h.ticker}`, "info"); }} className="text-mute hover:text-crit" aria-label={`Remove ${h.ticker}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, color, amount }: { label: string; value: number; color: string; amount: number }) {
  return (
    <div className="mb-2 grid grid-cols-[150px_1fr_86px] items-center gap-2 text-[11.5px]">
      <span className="flex items-center gap-1.5 truncate text-ink2">
        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="h-2 rounded-sm bg-line">
        <span className="block h-full rounded-sm" style={{ width: `${Math.max(1, value * 100)}%`, background: color }} />
      </span>
      <span className="num text-right text-ink">
        {pct(value, 1)} <span className="text-mute">{usd(amount, 0)}</span>
      </span>
    </div>
  );
}

function AddHolding({ held, onAdd }: { held: Set<string>; onAdd: (h: Holding) => void }) {
  const [q, setQ] = useState("");
  const [shares, setShares] = useState(100000);
  const [mode, setMode] = useState<"universe" | "custom">("universe");
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return UNIVERSE.filter((u) => !held.has(u.ticker) && (!s || u.ticker.toLowerCase().includes(s) || u.name.toLowerCase().includes(s) || SECTOR_BY_ID[u.sector].label.toLowerCase().includes(s))).slice(0, 8);
  }, [q, held]);

  return (
    <section className="panel overflow-hidden">
      <PanelHead
        title="Add holding"
        icon={<Plus size={14} />}
        right={
          <div className="flex rounded-md border border-line2 bg-raise p-0.5 text-[11.5px]">
            {(["universe", "custom"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded px-2.5 py-1 ${mode === m ? "bg-line2 text-ink" : "text-mute"}`}>
                {m === "universe" ? "From universe" : "Custom security"}
              </button>
            ))}
          </div>
        }
      />
      {mode === "universe" ? (
        <div className="p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-2.5 text-mute" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ticker, company or sector (e.g. Infosys, quantum, rare earths)" className="h-9 w-full rounded-md border border-line2 bg-raise pl-8 pr-3 text-[12.5px] outline-none focus:border-accent/60" />
            </div>
            <input type="number" value={shares} onChange={(e) => setShares(Number(e.target.value) || 0)} className="num h-9 w-[130px] rounded-md border border-line2 bg-raise px-2 text-right text-[12.5px] outline-none" aria-label="Shares" />
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
            {matches.map((u) => {
              const c = classify(u);
              return (
                <button key={u.ticker} onClick={() => onAdd({ ...u, id: u.ticker, shares })} className="flex items-center gap-2 rounded-md border border-line bg-panel2 px-2.5 py-2 text-left hover:border-line2 hover:bg-raise">
                  <Logo domain={u.domain} label={u.ticker} size={18} />
                  <div className="min-w-0 leading-tight">
                    <div className="text-[12px] font-semibold">
                      {u.ticker} <span className="font-normal text-mute">· {u.exchange}</span>
                    </div>
                    <div className="truncate text-[10.5px] text-mute">
                      {u.name} · <span className="text-jev">{c.code}</span>
                    </div>
                  </div>
                  <Plus size={14} className="ml-auto shrink-0 text-accent" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <CustomForm onAdd={onAdd} />
      )}
    </section>
  );
}

function CustomForm({ onAdd }: { onAdd: (h: Holding) => void }) {
  const [f, setF] = useState({ ticker: "", name: "", exchange: "NASDAQ", country: "US", domain: "", marketCapB: 5, price: 25, beta: 1.2, vol30: 40, shares: 200000, description: "" });
  const [ranked, setRanked] = useState<{ id: string; p: number; label: string; sector: SectorId }[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState("");
  const up = (k: keyof typeof f, v: string) => setF({ ...f, [k]: typeof f[k] === "number" ? Number(v) || 0 : v });

  const classifyJev = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/classify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, description: f.description }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRanked(j.ranked);
      setPick(j.ranked[0]?.id ?? null);
      setMeta(`${j.model} · ${j.latencyMs}ms · ${j.tokens} tokens`);
    } catch (e) {
      setMeta(`Classification failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const ind = pick ? INDUSTRY_BY_ID[pick] : null;
  const fields: [keyof typeof f, string][] = [
    ["ticker", "Ticker"],
    ["name", "Company name"],
    ["exchange", "Exchange"],
    ["country", "Country (ISO-2)"],
    ["domain", "Website domain"],
    ["marketCapB", "Market cap ($B)"],
    ["price", "Price (USD)"],
    ["beta", "Beta"],
    ["vol30", "30d vol %"],
    ["shares", "Shares"],
  ];
  return (
    <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {fields.map(([k, l]) => (
            <label key={k} className="block">
              <span className="label">{l}</span>
              <input value={String(f[k])} onChange={(e) => up(k, e.target.value)} className="num mt-1 h-8 w-full rounded-md border border-line2 bg-raise px-2 text-[12px] outline-none focus:border-accent/60" />
            </label>
          ))}
        </div>
        <label className="mt-2 block">
          <span className="label">Business description (sent to Jev for domain classification)</span>
          <textarea value={f.description} onChange={(e) => up("description", e.target.value)} rows={2} placeholder="e.g. Designs radiation-hardened FPGAs for satellites and missile guidance; 70% revenue from US defense primes" className="mt-1 w-full resize-none rounded-md border border-line2 bg-raise p-2 text-[12.5px] outline-none placeholder:text-mute focus:border-accent/60" />
        </label>
        <Btn onClick={classifyJev} disabled={busy || f.name.length < 2 || f.description.length < 12}>
          <Sparkles size={13} className="text-jev" /> {busy ? "Classifying…" : "Classify with Jev"}
        </Btn>
      </div>
      <div className="rounded-lg border border-line bg-panel2 p-3">
        <div className="label">JEV classification</div>
        {!ranked ? (
          <p className="mt-2 text-[12px] text-mute">Describe the business and let Jev pick the industry domain. Cap tier comes from market cap: {classify({ marketCapB: f.marketCapB, sector: "tech", industry: "", country: f.country }).capLabel}.</p>
        ) : (
          <>
            <div className="mt-2 space-y-1">
              {ranked.map((r) => (
                <button key={r.id} onClick={() => setPick(r.id)} className={`grid w-full grid-cols-[1fr_70px_40px] items-center gap-2 rounded px-1.5 py-1 text-left text-[11.5px] ${pick === r.id ? "bg-jev/15" : "hover:bg-raise"}`}>
                  <span className="truncate">
                    <span className="text-mute">{SECTOR_BY_ID[r.sector]?.label} · </span>
                    {r.label}
                  </span>
                  <span className="h-1.5 rounded-full bg-line">
                    <span className="block h-full rounded-full bg-jev" style={{ width: `${r.p * 100}%` }} />
                  </span>
                  <span className="num text-right">{pct(r.p)}</span>
                </button>
              ))}
            </div>
            <div className="num mt-2 text-[10.5px] text-mute">{meta}</div>
            {ind && (
              <div className="mt-3 text-[12px]">
                <span className="num text-jev">{classify({ marketCapB: f.marketCapB, sector: ind.sector, industry: ind.id, country: f.country }).code}</span>
                <div className="mt-1 text-[11px] text-mute">default exposure tags: {ind.tags.join(", ")}</div>
                <Btn
                  tone="primary"
                  className="mt-2"
                  disabled={!f.ticker}
                  onClick={() =>
                    onAdd({ ticker: f.ticker.toUpperCase(), name: f.name, exchange: f.exchange, country: f.country.toUpperCase(), domain: f.domain || "example.com", sector: ind.sector, industry: ind.id, marketCapB: f.marketCapB, price: f.price, beta: f.beta, vol30: f.vol30, tags: ind.tags, blurb: f.description, id: f.ticker.toUpperCase(), shares: f.shares })
                  }
                >
                  <Plus size={13} /> Add to book
                </Btn>
              </div>
            )}
          </>
        )}
        {!ranked && meta && <div className="mt-2 text-[11px] text-warn">{meta}</div>}
      </div>
    </div>
  );
}
