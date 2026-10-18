"use client";
import { useMemo } from "react";
import { Activity, Grid3x3, LayoutGrid, Radio, Waypoints } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { useBook, useSelected } from "@/lib/hooks";
import { eventRisks, pct, usd } from "@/lib/risk";
import { FUND } from "@/lib/data/universe";
import { FREE_FEED_LIMIT, FEEDS } from "@/lib/data/feeds";
import { fmtRange } from "@/lib/pipeline/calculus";
import { EventFocus } from "@/components/dash/EventFocus";
import { RiskTable } from "@/components/dash/RiskTable";
import { EventTape } from "@/components/dash/EventTape";
import { BookTreemap, Heatmap, Trajectory, TreeLegend } from "@/components/charts/Charts";
import { PanelHead, Stat, ThreatBadge } from "@/components/ui/bits";

export default function Command() {
  const book = useBook();
  const { ev, trace } = useSelected();
  const { holdings, hedges, pending, tier, activeFeeds, selectedTicker, set, traces } = useStore(
    useShallow((s) => ({ holdings: s.holdings, hedges: s.hedges, pending: s.pending, tier: s.tier, activeFeeds: s.activeFeeds, selectedTicker: s.selectedTicker, set: s.set, traces: s.traces }))
  );
  const risks = useMemo(() => eventRisks(ev, trace, holdings, hedges, book.nav), [ev, trace, holdings, hedges, book.nav]);
  const focus = risks.find((r) => r.ticker === selectedTicker) ?? risks[0];
  const tone = focus?.direction === "up" ? "var(--color-chart-up)" : "var(--color-chart-down)";

  const atRisk = Object.values(book.worstByTicker).filter((r) => r.threat === "CRITICAL" || r.threat === "ELEVATED");
  const varPct = (book.eventVar / (book.nav || 1)) * 100;
  const analysed = book.active.length;
  const latencies = Object.values(traces).map((t) => t.completedAt - t.receivedAt);
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const postureTone = book.posture >= 80 ? "var(--color-accent)" : book.posture >= 60 ? "var(--color-warn)" : book.posture >= 40 ? "var(--color-serious)" : "var(--color-crit)";

  const cols = book.active.slice(0, 12).map((a) => ({ uid: a.ev.uid, label: a.ev.label }));
  const riskIndex = useMemo(() => {
    const m: Record<string, Record<string, (typeof book.active)[number]["risks"][number]>> = {};
    for (const a of book.active) for (const r of a.risks) (m[a.ev.uid] ??= {})[r.ticker] = r;
    return m;
  }, [book]);
  const heatRows = [...holdings].sort((a, b) => (book.worstByTicker[b.ticker]?.expectedLoss ?? -1) - (book.worstByTicker[a.ticker]?.expectedLoss ?? -1));

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Net asset value" value={usd(book.nav, 2)} sub={`${holdings.length} holdings · ${FUND.manager}`} />
        <Stat label="Event VaR (live alerts)" value={usd(book.eventVar)} sub={`${varPct.toFixed(2)}% of NAV · budget ${FUND.drawdownBudgetPct}%`} tone={varPct > FUND.drawdownBudgetPct ? "var(--color-crit)" : varPct > 0.5 ? "var(--color-serious)" : undefined} />
        <Stat label="Preservation posture" value={`${book.posture}/100`} sub={book.posture >= 80 ? "Capital well protected" : book.posture >= 60 ? "Watch exposures" : "Act on open alerts"} tone={postureTone} />
        <Stat label="Holdings at risk" value={atRisk.length} sub={atRisk.length ? atRisk.slice(0, 3).map((r) => r.ticker).join(", ") : "None elevated"} tone={atRisk.length ? "var(--color-serious)" : undefined} />
        <Stat label="Active feeds" value={`${activeFeeds.length}${tier === "free" ? ` / ${FREE_FEED_LIMIT}` : ` / ${FEEDS.length}`}`} sub={tier === "free" ? "Free plan" : "Enterprise surveillance"} />
        <Stat label="Live events (20 min)" value={analysed} sub={avgLatency ? `avg ingest→score ${(avgLatency / 1000).toFixed(2)}s` : "—"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <EventFocus ev={ev} trace={trace} risks={risks} pending={ev ? Boolean(pending[ev.uid]) : false} />
          <section className="panel overflow-hidden">
            <PanelHead title="Holdings at risk from this event" sub={ev ? ev.label : undefined} icon={<Activity size={14} />} right={<span className="text-[11px] text-mute">click a row for its trajectory</span>} />
            <RiskTable risks={risks} holdings={holdings} selected={focus?.ticker} onSelect={(t) => set({ selectedTicker: t })} compact />
          </section>
        </div>
        <section className="panel flex max-h-[860px] flex-col overflow-hidden">
          <PanelHead title="Intelligence tape" icon={<Radio size={14} />} right={<span className="num text-[11px] text-mute">{book.active.length} open</span>} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <EventTape limit={20} />
          </div>
        </section>
      </div>

      {focus && trace && (
        <section className="panel overflow-hidden">
          <PanelHead
            title="Impact trajectory"
            sub={`${focus.ticker} · ${ev?.label}`}
            icon={<Waypoints size={14} />}
            right={
              <div className="flex items-center gap-2">
                <ThreatBadge threat={focus.threat} size="xs" />
                <span className="num text-[11px] text-ink2">
                  {pct(focus.probability)} · {fmtRange(focus.range)} {focus.direction}
                </span>
              </div>
            }
          />
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <Trajectory r={focus} horizon={trace.llm.extraction.horizon} seed={`${trace.uid}${focus.ticker}`} />
              <p className="mt-1 text-[10.5px] text-mute">Modelled cumulative return path (median and P10–P90) from Jev magnitude and direction probabilities over the {trace.llm.extraction.horizon} horizon. Synthetic illustration, not a forecast.</p>
            </div>
            <div>
              <div className="label mb-2">Transmission mechanism</div>
              <ol className="space-y-2">
                {focus.mechanism.map((m, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-ink2">
                    <span className="num mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]" style={{ background: `color-mix(in oklab, ${tone} 22%, var(--color-raise))`, color: tone }}>
                      {i + 1}
                    </span>
                    {m}
                  </li>
                ))}
              </ol>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="rounded-md bg-raise px-2.5 py-2">
                  <div className="text-mute">Exposure weight</div>
                  <div className="num text-ink">{focus.exposureWeight.toFixed(2)}</div>
                </div>
                <div className="rounded-md bg-raise px-2.5 py-2">
                  <div className="text-mute">Event factor</div>
                  <div className="num text-ink">{focus.eventFactor.toFixed(2)}</div>
                </div>
                <div className="rounded-md bg-raise px-2.5 py-2">
                  <div className="text-mute">Position</div>
                  <div className="num text-ink">{usd(focus.positionValue)}</div>
                </div>
                <div className="rounded-md bg-raise px-2.5 py-2">
                  <div className="text-mute">Hedge ratio</div>
                  <div className="num text-ink">{pct(focus.hedgeRatio)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <PanelHead title="Risk heatmap" sub="holdings × open events" icon={<Grid3x3 size={14} />} />
          <div className="max-h-[520px] overflow-y-auto p-3">
            {cols.length ? (
              <Heatmap rows={heatRows} cols={cols} cell={(t, u) => riskIndex[u]?.[t]} onPick={(u, t) => set({ selectedUid: u, selectedTicker: t })} />
            ) : (
              <div className="px-2 py-6 text-[12.5px] text-mute">Fills as events are scored.</div>
            )}
          </div>
        </section>
        <section className="panel overflow-hidden">
          <PanelHead title="Book treemap" sub="size = position value · shade = worst open threat" icon={<LayoutGrid size={14} />} />
          <div className="p-3">
            <BookTreemap holdings={holdings} threatOf={(t) => book.worstByTicker[t]?.threat} onPick={(t) => { const w = book.worstByTicker[t]; if (w) set({ selectedUid: w.uid, selectedTicker: t }); }} />
            <div className="mt-2"><TreeLegend /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
