"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, Pause, ChevronLeft, ChevronRight, BookOpenCheck } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { useSelected } from "@/lib/hooks";
import { eventRisks, navOf, pct, usd } from "@/lib/risk";
import { classify } from "@/lib/jev/classify";
import { FEED_BY_ID } from "@/lib/data/feeds";
import { EXPOSURE_WEIGHTS, MAG_BUCKETS, fmtRange } from "@/lib/pipeline/calculus";
import { Btn, LayerTag, PanelHead, ThreatBadge } from "@/components/ui/bits";

const FLOW = [
  { id: "feeds", t: "18 intelligence feeds", d: "X posts, wires, regulators (simulated)" },
  { id: "llm", t: "LLM extraction", d: "Claude: entities, dependencies, sentiment, impact vectors", layer: "llm" as const },
  { id: "screen", t: "Exposure screen", d: "vectors × JEV tags / industries / tickers" },
  { id: "jev", t: "Jev scoring", d: "exposure · direction · magnitude · systemic", layer: "jev" as const },
  { id: "calc", t: "Risk calculus", d: "probability, range, CI, expected loss", layer: "calc" as const },
  { id: "push", t: "Push + console", d: "alert < 60s, full trace" },
];

export default function Method() {
  const { ev, trace } = useSelected();
  const { holdings, hedges } = useStore(useShallow((s) => ({ holdings: s.holdings, hedges: s.hedges })));
  const nav = navOf(holdings);
  const risks = useMemo(() => eventRisks(ev, trace, holdings, hedges, nav), [ev, trace, holdings, hedges, nav]);
  const [ticker, setTicker] = useState<string | null>(null);
  const r = risks.find((x) => x.ticker === ticker) ?? risks[0];
  const h = holdings.find((x) => x.ticker === r?.ticker);
  const a = r && trace ? trace.jev.holdings[r.ticker] : undefined;
  const hit = r && trace ? trace.screened.find((s) => s.ticker === r.ticker) : undefined;
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const STEPS = 6;

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setStep((s) => (s + 1 >= STEPS ? (setAuto(false), s) : s + 1)), 2200);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="flex items-center gap-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em]">
          <BookOpenCheck size={16} className="text-jev" /> How Jev decides
        </h1>
        <p className="max-w-3xl text-[12.5px] text-mute">
          A cloud LLM reads the news; Jev, TypeSafe&apos;s System One classification model, turns that reading into calibrated probabilities for every exposed holding in one ~150 ms request. Below, a real decision from your book is replayed one step at a time.
        </p>
      </div>

      <section className="panel overflow-x-auto p-4">
        <div className="flex min-w-[860px] items-stretch gap-2">
          {FLOW.map((f, i) => (
            <div key={f.id} className="flex flex-1 items-center gap-2">
              <div className={`flex-1 rounded-lg border p-3 ${f.layer === "jev" ? "border-jev/50 bg-jev/[0.07]" : f.layer === "llm" ? "border-llm/40 bg-llm/[0.06]" : "border-line bg-panel2"}`}>
                <div className="flex items-center gap-1.5">
                  {f.layer && <LayerTag layer={f.layer} />}
                  <span className="text-[12.5px] font-semibold">{f.t}</span>
                </div>
                <div className="mt-1 text-[11px] leading-snug text-mute">{f.d}</div>
              </div>
              {i < FLOW.length - 1 && <ChevronRight size={16} className="shrink-0 text-mute" />}
            </div>
          ))}
        </div>
      </section>

      {!ev || !trace || !r || !h || !a || !hit ? (
        <div className="panel p-6 text-[13px] text-mute">
          Select an event with exposed holdings on the <Link href="/" className="text-accent">Command</Link> page, or fire one in the <Link href="/stress" className="text-accent">Stress Lab</Link>, then come back.
        </div>
      ) : (
        <section className="panel overflow-hidden">
          <PanelHead
            title="Walkthrough"
            sub={`${ev.label} → ${r.ticker}`}
            right={
              <div className="flex items-center gap-2">
                <select value={r.ticker} onChange={(e) => { setTicker(e.target.value); setStep(0); }} className="h-7 rounded border border-line2 bg-raise px-1.5 text-[11.5px] outline-none">
                  {risks.map((x) => (
                    <option key={x.ticker}>{x.ticker}</option>
                  ))}
                </select>
                <Btn tone="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                  <ChevronLeft size={13} />
                </Btn>
                <span className="num text-[11px] text-mute">
                  {step + 1}/{STEPS}
                </span>
                <Btn tone="ghost" onClick={() => setStep(Math.min(STEPS - 1, step + 1))} disabled={step === STEPS - 1}>
                  <ChevronRight size={13} />
                </Btn>
                <Btn tone="primary" onClick={() => { if (step === STEPS - 1) setStep(0); setAuto(!auto); }}>
                  {auto ? <Pause size={13} /> : <Play size={13} />} {auto ? "Pause" : "Play"}
                </Btn>
              </div>
            }
          />
          <div className="grid gap-px bg-line md:grid-cols-[220px_minmax(0,1fr)]">
            <ol className="bg-panel p-2">
              {["The headline", "What the LLM saw", "JEV classification", "What Jev answered", "The arithmetic", "The decision"].map((t, i) => (
                <li key={t}>
                  <button onClick={() => setStep(i)} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] ${step === i ? "bg-raise text-ink" : i < step ? "text-ink2" : "text-mute"}`}>
                    <span className={`num grid h-5 w-5 place-items-center rounded-full text-[10px] ${i <= step ? "bg-jev text-on-accent" : "bg-line2"}`}>{i + 1}</span>
                    {t}
                  </button>
                </li>
              ))}
            </ol>
            <div key={`${step}-${r.ticker}`} className="stage-in min-h-[300px] bg-panel p-5">
              {step === 0 && (
                <div>
                  <div className="label">{FEED_BY_ID[ev.feedId].name} · source reliability {FEED_BY_ID[ev.feedId].reliability}</div>
                  <p className="mt-2 text-[18px] font-medium leading-snug">{ev.headline}</p>
                  <p className="mt-2 text-[12.5px] text-ink2">{ev.body}</p>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-3 text-[13px]">
                  <p className="text-ink2">
                    <LayerTag layer="llm" /> {trace.llm.model} ({trace.llm.mode}) summarised: <span className="text-ink">{trace.llm.extraction.summary}</span>
                  </p>
                  <p className="text-ink2">
                    It flagged <b className="text-ink">{r.ticker}</b> through a <b className="text-ink">{hit.link}</b> link pointing <b className="text-ink">{hit.direction}</b>, via:
                  </p>
                  <ol className="ml-1 space-y-1.5">
                    {hit.chain.map((c, i) => (
                      <li key={i} className="flex gap-2 text-ink">
                        <span className="num text-llm">{i + 1}.</span>
                        {c}
                      </li>
                    ))}
                  </ol>
                  <p className="text-[12px] text-mute">The LLM proposes the transmission story. It does not set the probabilities: that is Jev&apos;s job.</p>
                </div>
              )}
              {step === 2 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["JEV code", classify(h).code],
                    ["Cap tier", classify(h).capLabel],
                    ["Industry domain", classify(h).industryLabel],
                    ["Region", `${classify(h).region} · ${h.exchange} ${h.country}`],
                    ["Beta / 30d vol", `${h.beta} / ${h.vol30}%`],
                    ["Exposure tags", h.tags.join(", ")],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md bg-panel2 p-3">
                      <div className="label">{k}</div>
                      <div className="num mt-1 text-[13px] text-ink">{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {step === 3 && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Answer title="Exposure (choice)" rows={Object.entries(a.exposure)} />
                  <Answer title="Direction (choice)" rows={Object.entries(a.direction)} />
                  <Answer title="Magnitude (score)" rows={MAG_BUCKETS.map((b, i) => [b.hi === 20 ? ">12%" : `${b.lo}–${b.hi}%`, a.magnitude[i] ?? 0])} />
                  <p className="text-[12px] text-mute md:col-span-3">
                    {trace.jev.mode === "live" ? `Live answer from ${trace.jev.model} in ${trace.jev.latencyMs} ms for ${trace.jev.inputTokens.toLocaleString()} input tokens ($${trace.jev.costUsd.toFixed(6)}).` : `Deterministic fallback (${trace.jev.error ?? "API unavailable"}).`} Follow-through probability for the event as a whole: {pct(trace.jev.followThrough)}.
                  </p>
                </div>
              )}
              {step === 4 && (
                <div className="num space-y-2 text-[12.5px] leading-relaxed text-ink2">
                  <div>
                    w = {a.exposure.direct.toFixed(2)}×{EXPOSURE_WEIGHTS.direct} + {a.exposure.indirect.toFixed(2)}×{EXPOSURE_WEIGHTS.indirect} + {a.exposure.peripheral.toFixed(2)}×{EXPOSURE_WEIGHTS.peripheral} = <b className="text-ink">{r.exposureWeight.toFixed(3)}</b>
                  </div>
                  <div>
                    f = 0.45 + 0.55 × (½×{FEED_BY_ID[ev.feedId].reliability} + ½×{trace.jev.followThrough.toFixed(2)}) = <b className="text-ink">{r.eventFactor.toFixed(3)}</b>
                  </div>
                  <div>
                    probability = P({r.direction}) {r.pDirection.toFixed(2)} × (0.4 + 0.6×{r.exposureWeight.toFixed(2)}) × {r.eventFactor.toFixed(2)} = <b className="text-accent">{pct(r.probability, 1)}</b>
                  </div>
                  <div>
                    range (P25–P75) = <b className="text-ink">{fmtRange(r.range)}</b> · CI (P10–P90) = {r.ci[0].toFixed(1)}–{r.ci[1].toFixed(1)}% · E[move] = {r.expectedMovePct.toFixed(2)}%
                  </div>
                  <div>
                    expected loss = {usd(r.positionValue)} × {r.expectedMovePct.toFixed(2)}% × {r.probability.toFixed(2)} × (1 − {r.hedgeRatio.toFixed(2)}) = <b className="text-loss">{r.direction === "down" ? usd(r.expectedLoss) : "n/a (upside)"}</b>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div>
                  <ThreatBadge threat={r.threat} />
                  <p className="mt-3 text-[20px] font-medium leading-snug">
                    {pct(r.probability)} likelihood of a {fmtRange(r.range)} {r.direction === "down" ? "downward correction" : "upward move"} in {r.ticker}.
                  </p>
                  <p className="mt-2 text-[13px] text-ink2">
                    {r.direction === "down" ? `Expected loss ${usd(r.expectedLoss)} (${pct(r.expectedLoss / (nav || 1), 2)} of NAV).` : "Fluctuation risk: consider trimming into strength."} Threat rules: CRITICAL if probability ≥ 65% and E[move] ≥ 4.5%, or loss ≥ 0.35% of NAV; ELEVATED if ≥ 50% and ≥ 2.5%, or ≥ 0.15% of NAV; GUARDED if ≥ 30% and ≥ 1.2%.
                  </p>
                  <Link href="/trace" className="mt-3 inline-block text-[12.5px] text-accent">
                    See the full trace →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="panel overflow-hidden">
        <PanelHead title="Integration points" sub="see README.md for request / response shapes" />
        <table className="w-full text-[12px]">
          <tbody>
            {[
              ["Cloud LLM", "Anthropic Messages API · src/lib/llm/client.ts", "ANTHROPIC_API_KEY, LLM_MODEL (default claude-haiku-5-5)", "Falls back to curated fixtures / keyword heuristic"],
              ["Jev scoring", "POST https://api.typesafe.ai/v1/systemone · src/lib/jev/client.ts", "TYPESAFE_API_KEY, JEV_MODEL, JEV_API_URL", "Deterministic fallback with the same answer shape"],
              ["Jev classification", "POST /api/classify (choice over 30 industry domains)", "TYPESAFE_API_KEY", "Manual domain picker"],
              ["Feeds", "src/lib/data/feeds.ts + events.ts (simulated)", "n/a", "Connector interface documented in README"],
              ["Push", "Simulated in-browser device (APNs / FCM hop modelled)", "n/a", "n/a"],
            ].map(([a, b, c, d]) => (
              <tr key={a} className="border-b border-line/60">
                <td className="px-4 py-2 font-semibold">{a}</td>
                <td className="num px-4 py-2 text-[11.5px] text-ink2">{b}</td>
                <td className="num px-4 py-2 text-[11.5px] text-mute">{c}</td>
                <td className="px-4 py-2 text-[11.5px] text-mute">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Answer({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <div>
      <div className="label mb-1.5">
        <LayerTag layer="jev" /> {title}
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="mb-1.5 grid grid-cols-[70px_1fr_40px] items-center gap-2 text-[12px]">
          <span className={v === max ? "text-ink" : "text-ink2"}>{k}</span>
          <span className="h-1.5 rounded-full bg-line">
            <span className="block h-full rounded-full bg-jev" style={{ width: `${v * 100}%`, opacity: v === max ? 1 : 0.55 }} />
          </span>
          <span className="num text-right">{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
