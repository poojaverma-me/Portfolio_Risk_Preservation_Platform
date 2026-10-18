"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, ChevronDown, ChevronRight, Braces } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { useSelected } from "@/lib/hooks";
import { eventRisks, navOf, pct, usd } from "@/lib/risk";
import { FEED_BY_ID } from "@/lib/data/feeds";
import { classify } from "@/lib/jev/classify";
import { EXPOSURE_WEIGHTS, MAG_BUCKETS, SYSTEMIC_SCALE, fmtRange } from "@/lib/pipeline/calculus";
import { matchReasons } from "@/lib/pipeline/screen";
import { EventTape } from "@/components/dash/EventTape";
import { SourceLine } from "@/components/dash/EventFocus";
import { Btn, LayerTag, PanelHead, ThreatBadge, clock } from "@/components/ui/bits";

export default function TracePage() {
  const { ev, trace } = useSelected();
  const { holdings, hedges } = useStore(useShallow((s) => ({ holdings: s.holdings, hedges: s.hedges })));
  const nav = navOf(holdings);
  const risks = useMemo(() => eventRisks(ev, trace, holdings, hedges, nav), [ev, trace, holdings, hedges, nav]);
  const [revealed, setRevealed] = useState(6);
  const [replayKey, setReplayKey] = useState(0);

  // Replay animates the stages in at a readable pace.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);
  const replay = () => {
    if (timer.current) clearInterval(timer.current);
    setRevealed(0);
    setReplayKey((k) => k + 1);
    let i = 0;
    timer.current = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= 6 && timer.current) clearInterval(timer.current);
    }, 650);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-line bg-panel">
        <PanelHead title="Events" sub="select to inspect" />
        <EventTape limit={30} />
      </aside>
      <div className="min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-5 py-3 backdrop-blur">
          <div>
            <h1 className="font-cond text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">AI Reasoning & Traceability</h1>
            <p className="text-[11.5px] text-mute">Every stage from raw headline to risk calculus, with the actual model inputs and outputs.</p>
          </div>
          <Btn onClick={replay} disabled={!trace}>
            <Play size={13} /> Replay pipeline
          </Btn>
        </div>
        {!ev || !trace ? (
          <div className="p-8 text-[13px] text-mute">{ev ? "This event is still being analysed…" : "No events yet."}</div>
        ) : (
          <div key={`${trace.uid}-${replayKey}`} className="space-y-3 p-5 font-mono text-[12px]">
            {revealed > 0 && (
              <Stage n="00" title="Ingest" ms={trace.stages[0].ms} meta={`${FEED_BY_ID[ev.feedId].name} · received ${clock(trace.receivedAt)}`}>
                <SourceLine ev={ev} />
                <p className="mt-2 font-sans text-[15px] leading-snug text-ink">{ev.headline}</p>
                {ev.body && <p className="mt-1 font-sans text-[12.5px] text-ink2">{ev.body}</p>}
                <Json label="Raw payload" data={{ id: ev.id, uid: ev.uid, source: ev.feedId, author: ev.author, headline: ev.headline, body: ev.body, origin: ev.origin, firedAt: new Date(ev.firedAt).toISOString(), sourceReliability: FEED_BY_ID[ev.feedId].reliability }} />
              </Stage>
            )}

            {revealed > 1 && (
              <Stage n="01" layer="llm" title="LLM contextual extraction" ms={trace.stages[1].ms} meta={`${trace.llm.model} · mode ${trace.llm.mode}${trace.llm.inputTokens ? ` · ${trace.llm.inputTokens}→${trace.llm.outputTokens} tok` : ""}`}>
                {trace.llm.mode !== "live" && (
                  <div className="mb-2 rounded border border-warn/30 bg-warn/10 px-2.5 py-1.5 font-sans text-[11.5px] text-warn">
                    {trace.llm.mode === "fixture" ? "Curated analysis used" : "Keyword heuristic used"}: {trace.llm.error}
                  </div>
                )}
                <div className="font-sans text-[13px] text-ink">{trace.llm.extraction.summary}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink2">
                  <span>type <b className="text-llm">{trace.llm.extraction.eventType}</b></span>
                  <span>sentiment <b className="text-llm">{trace.llm.extraction.sentiment.toFixed(2)}</b></span>
                  <span>horizon <b className="text-llm">{trace.llm.extraction.horizon}</b></span>
                </div>
                <div className="label mt-3">Step-by-step analysis</div>
                <ol className="mt-1 space-y-1 font-sans text-[12.5px] text-ink2">
                  {trace.llm.extraction.reasoning.map((r, i) => (
                    <li key={i} className="stage-in flex gap-2" style={{ animationDelay: `${i * 90}ms` }}>
                      <span className="num text-llm">{String(i + 1).padStart(2, "0")}</span>
                      {r}
                    </li>
                  ))}
                </ol>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="label">Entities</div>
                    <table className="mt-1 w-full text-[11.5px]">
                      <tbody>
                        {trace.llm.extraction.entities.map((e) => (
                          <tr key={e.name} className="border-b border-line/60">
                            <td className="py-1 pr-2 font-sans text-ink">{e.name}</td>
                            <td className="py-1 pr-2 text-llm">{e.type}</td>
                            <td className="py-1 font-sans text-mute">{e.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="label">Sectoral dependencies</div>
                    <ul className="mt-1 space-y-1 text-[11.5px]">
                      {trace.llm.extraction.dependencies.map((d, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded px-1 text-[9.5px] ${d.order === 1 ? "bg-crit/20 text-loss" : "bg-raise text-ink2"}`}>{d.order === 1 ? "1st" : "2nd"}</span>
                          <span className="font-sans text-ink">{d.from}</span>
                          <span className="text-mute">→</span>
                          <span className="font-sans text-ink">{d.to}</span>
                          <span className="font-sans text-mute">({d.relation})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Json label="Impact vectors (LLM output)" data={trace.llm.extraction.vectors} />
              </Stage>
            )}

            {revealed > 2 && (
              <Stage n="02" title="Exposure screen + JEV classification" ms={trace.stages[2].ms} meta={`${trace.screened.length} exposed · ${trace.screenedOut} screened out`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr className="text-left">
                        {["Ticker", "JEV code", "Cap tier", "Domain", "Region", "β / vol30", "Matched by", "Link"].map((h) => (
                          <th key={h} className="label border-b border-line py-1.5 pr-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trace.screened.map((hit) => {
                        const h = holdings.find((x) => x.ticker === hit.ticker);
                        if (!h) return null;
                        const c = classify(h);
                        const reasons = trace.llm.extraction.vectors.filter((v) => hit.vectorIds.includes(v.id)).flatMap((v) => matchReasons(h, v.match).map((r) => `${v.id}: ${r}`));
                        return (
                          <tr key={hit.ticker} className="border-b border-line/60 align-top">
                            <td className="py-1.5 pr-3 font-semibold text-ink">{h.ticker}</td>
                            <td className="py-1.5 pr-3 text-jev">{c.code}</td>
                            <td className="py-1.5 pr-3 text-ink2">{c.capLabel}</td>
                            <td className="py-1.5 pr-3 font-sans text-ink2">{c.industryLabel}</td>
                            <td className="py-1.5 pr-3 text-ink2">{c.region}</td>
                            <td className="py-1.5 pr-3 text-ink2">
                              {h.beta} / {h.vol30}%
                            </td>
                            <td className="py-1.5 pr-3 text-mute">{reasons.slice(0, 3).join(" · ")}</td>
                            <td className="py-1.5 pr-3 text-ink2">
                              {hit.link} {hit.direction === "down" ? "↓" : "↑"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Stage>
            )}

            {revealed > 3 && (
              <Stage n="03" layer="jev" title="Jev model scoring" ms={trace.stages[3].ms} meta={`${trace.jev.model} · mode ${trace.jev.mode}${trace.jev.inputTokens ? ` · ${trace.jev.inputTokens.toLocaleString()} input tok · $${trace.jev.costUsd.toFixed(6)}` : ""}`}>
                {trace.jev.error && <div className="mb-2 rounded border border-warn/30 bg-warn/10 px-2.5 py-1.5 font-sans text-[11.5px] text-warn">{trace.jev.error}</div>}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="label">Systemic spread (score)</div>
                    {SYSTEMIC_SCALE.map((s, i) => (
                      <Bar key={s} label={s} p={trace.jev.systemic[i] ?? 0} color="var(--color-jev)" />
                    ))}
                  </div>
                  <div>
                    <div className="label">Follow-through (noul)</div>
                    <Bar label="Measure takes effect / is acted on" p={trace.jev.followThrough} color="var(--color-jev)" />
                    <p className="mt-2 font-sans text-[11px] text-mute">One batched request answers {Object.keys((trace.jev.request as { questions?: object })?.questions ?? {}).length || "all"} questions: exposure (choice), direction (choice) and magnitude (score) for every exposed holding, plus two portfolio-level questions.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {trace.screened.map((hit) => {
                    const a = trace.jev.holdings[hit.ticker];
                    if (!a) return null;
                    return (
                      <div key={hit.ticker} className="rounded-md border border-line bg-panel2 p-2.5">
                        <div className="mb-1 font-semibold text-ink">{hit.ticker}</div>
                        <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                          <ProbList title="exposure" p={a.exposure} />
                          <ProbList title="direction" p={a.direction} />
                          <ProbList title="magnitude" p={Object.fromEntries(MAG_BUCKETS.map((b, i) => [b.hi === 20 ? ">12%" : `${b.lo}–${b.hi}%`, a.magnitude[i] ?? 0]))} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Json label="Jev request (POST /v1/systemone)" data={trace.jev.request} />
                {trace.jev.response ? <Json label="Jev response" data={trace.jev.response} /> : null}
              </Stage>
            )}

            {revealed > 4 && (
              <Stage n="04" title="Risk calculus" layer="calc" ms={0} meta="computed client-side from Jev answers · recomputes on hedge / share changes">
                <div className="mb-2 rounded-md bg-panel2 p-2.5 text-[11px] leading-relaxed text-ink2">
                  w = P(direct)·{EXPOSURE_WEIGHTS.direct} + P(indirect)·{EXPOSURE_WEIGHTS.indirect} + P(peripheral)·{EXPOSURE_WEIGHTS.peripheral}
                  <br />f = 0.45 + 0.55·(½·source reliability + ½·follow-through)
                  <br />probability = P(direction) · (0.4 + 0.6·w) · f
                  <br />range = P25–P75 and CI = P10–P90 of the Jev magnitude distribution; E[move] = Σ p·bucket midpoint
                  <br />expected loss = position · E[move] · probability · (1 − hedge ratio)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr className="text-left">
                        {["Ticker", "w", "P(dir)", "f", "= prob", "range", "E[move]", "position", "hedge", "= exp. loss", "threat"].map((h) => (
                          <th key={h} className="label border-b border-line py-1.5 pr-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {risks.map((r) => (
                        <tr key={r.ticker} className="border-b border-line/60">
                          <td className="py-1.5 pr-3 font-semibold text-ink">{r.ticker}</td>
                          <td className="py-1.5 pr-3">{r.exposureWeight.toFixed(2)}</td>
                          <td className="py-1.5 pr-3">
                            {r.pDirection.toFixed(2)} {r.direction === "down" ? "↓" : "↑"}
                          </td>
                          <td className="py-1.5 pr-3">{r.eventFactor.toFixed(2)}</td>
                          <td className="py-1.5 pr-3 text-accent">{pct(r.probability)}</td>
                          <td className="py-1.5 pr-3">{fmtRange(r.range)}</td>
                          <td className="py-1.5 pr-3">{r.expectedMovePct.toFixed(2)}%</td>
                          <td className="py-1.5 pr-3">{usd(r.positionValue)}</td>
                          <td className="py-1.5 pr-3">{pct(r.hedgeRatio)}</td>
                          <td className="py-1.5 pr-3 text-loss">{r.direction === "down" ? usd(r.expectedLoss) : "—"}</td>
                          <td className="py-1.5 pr-3">
                            <ThreatBadge threat={r.threat} size="xs" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Stage>
            )}

            {revealed > 5 && <Dispatch uid={ev.uid} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Dispatch({ uid }: { uid: string }) {
  const alert = useStore((s) => s.alerts.find((a) => a.uid === uid));
  return (
    <Stage n="05" title="Push dispatch" ms={alert ? alert.deliveredMs : 0} meta={alert ? `delivered ${(alert.deliveredMs / 1000).toFixed(2)}s after ingest · SLA 60s` : "no alert (no holding above LOW)"}>
      {alert ? (
        <div className="font-sans text-[12.5px] text-ink2">
          <ThreatBadge threat={alert.threat} size="xs" /> <b className="text-ink">{alert.title}</b>: {alert.tickers.map((t) => `${t.ticker} ${t.direction === "down" ? "↓" : "↑"} ${pct(t.probability)} ${fmtRange(t.range)}`).join(" · ")}
          <span className="ml-2 text-mute">status: {alert.status}</span>
        </div>
      ) : (
        <div className="font-sans text-[12.5px] text-mute">Nothing crossed the alert threshold, so no push was sent.</div>
      )}
    </Stage>
  );
}

function Stage({ n, title, ms, meta, layer, children }: { n: string; title: string; ms: number; meta?: string; layer?: "llm" | "jev" | "calc"; children: React.ReactNode }) {
  return (
    <section className="stage-in panel overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line bg-panel2 px-3.5 py-2">
        <span className="text-mute">[{n}]</span>
        {layer && <LayerTag layer={layer} />}
        <span className="font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">{title}</span>
        <span className="ml-auto truncate text-[10.5px] text-mute">{meta}</span>
        {ms > 0 && <span className="shrink-0 rounded bg-raise px-1.5 text-[10.5px] text-ink2">{ms}ms</span>}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Bar({ label, p, color }: { label: string; p: number; color: string }) {
  return (
    <div className="mt-1.5 grid grid-cols-[1fr_120px_44px] items-center gap-2 text-[11px]">
      <span className="truncate font-sans text-ink2">{label}</span>
      <span className="h-1.5 rounded-full bg-line">
        <span className="block h-full rounded-full" style={{ width: `${p * 100}%`, background: color }} />
      </span>
      <span className="text-right text-ink">{pct(p)}</span>
    </div>
  );
}

function ProbList({ title, p }: { title: string; p: Record<string, number> }) {
  const max = Math.max(...Object.values(p));
  return (
    <div>
      <div className="mb-0.5 text-mute">{title}</div>
      {Object.entries(p).map(([k, v]) => (
        <div key={k} className={`flex justify-between ${v === max ? "text-jev" : "text-ink2"}`}>
          <span>{k}</span>
          <span>{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function Json({ label, data }: { label: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] text-mute hover:text-ink">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Braces size={12} /> {label}
      </button>
      {open && <pre className="mt-1.5 max-h-[340px] overflow-auto rounded-md border border-line bg-code p-3 text-[11px] leading-relaxed text-ink2">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
