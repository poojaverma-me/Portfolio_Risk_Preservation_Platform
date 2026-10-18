"use client";
import Link from "next/link";
import { ScanSearch, Loader2 } from "lucide-react";
import type { FiredEvent, RiskCalc, Trace } from "@/lib/types";
import { FEED_BY_ID } from "@/lib/data/feeds";
import { pct } from "@/lib/risk";
import { fmtRange, worstThreat } from "@/lib/pipeline/calculus";
import { Gauge, MagnitudeChart, SystemicMeter } from "../charts/Charts";
import { LayerTag, Logo, ThreatBadge, clock } from "../ui/bits";

export function SourceLine({ ev }: { ev: FiredEvent }) {
  const feed = FEED_BY_ID[ev.feedId];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-mute">
      <Logo domain={feed.domain} label={feed.name} size={18} />
      <span className="font-medium text-ink2">{feed.name}</span>
      <span>{ev.author ?? feed.handle}</span>
      <span className="num">{clock(ev.firedAt)}</span>
      <span className="rounded border border-line2 px-1.5 py-[1px] font-cond text-[9.5px] font-semibold uppercase tracking-wider text-mute">Simulated</span>
      {ev.origin !== "stream" && <span className="rounded bg-jev/15 px-1.5 py-[1px] font-cond text-[9.5px] font-semibold uppercase tracking-wider text-jev">{ev.origin === "stress" ? "Stress test" : "Custom"}</span>}
    </div>
  );
}

export function EventFocus({ ev, trace, risks, pending }: { ev?: FiredEvent; trace?: Trace; risks: RiskCalc[]; pending: boolean }) {
  if (!ev)
    return (
      <div className="panel grid h-[320px] place-items-center text-[13px] text-mute">
        Waiting for the first event from your active feeds…
      </div>
    );
  const top = risks[0];
  const threat = worstThreat(risks.map((r) => r.threat));
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <SourceLine ev={ev} />
          {trace && <ThreatBadge threat={risks.length ? threat : "LOW"} />}
        </div>
        <p className="mt-2 text-[16.5px] font-medium leading-snug text-ink">{ev.headline}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {pending && (
            <span className="relative flex items-center gap-1.5 overflow-hidden rounded bg-raise px-2 py-1 text-[11px] text-ink2 scan">
              <Loader2 size={12} className="animate-spin" /> Running LLM extraction → Jev scoring…
            </span>
          )}
          {trace?.stages.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 rounded bg-raise px-2 py-1 text-[11px] text-ink2">
              {s.id === "llm" ? <LayerTag layer="llm" /> : s.id === "jev" ? <LayerTag layer="jev" /> : null}
              {s.label}
              <span className="num text-mute">{s.ms}ms</span>
            </span>
          ))}
          {trace && (
            <Link href="/trace" className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[11.5px] text-accent hover:bg-raise">
              <ScanSearch size={13} /> Open reasoning trace
            </Link>
          )}
        </div>
      </div>
      {trace && top ? (
        <div className="grid gap-4 p-4 md:grid-cols-[200px_1fr_220px]">
          <Gauge value={top.probability} color={top.direction === "down" ? "var(--color-chart-down)" : "var(--color-chart-up)"} label={`${top.ticker} · ${top.direction === "down" ? "downside" : "upside"} probability`} sub={`${fmtRange(top.range)} ${top.direction === "down" ? "correction" : "move"}`} />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Jev magnitude distribution · {top.ticker}</span>
              <span className="num text-[11px] text-mute">E[move] {top.expectedMovePct.toFixed(1)}%</span>
            </div>
            <MagnitudeChart probs={trace.jev.holdings[top.ticker]?.magnitude ?? []} direction={top.direction} />
          </div>
          <div className="space-y-3.5">
            <div>
              <div className="label mb-1.5">Systemic spread</div>
              <SystemicMeter probs={trace.jev.systemic} />
            </div>
            <KV k="Follow-through" v={pct(trace.jev.followThrough)} />
            <KV k="Narrative sentiment" v={trace.llm.extraction.sentiment.toFixed(2)} tone={trace.llm.extraction.sentiment < 0 ? "var(--color-serious)" : "var(--color-up)"} />
            <KV k="Holdings exposed" v={`${trace.screened.length} / ${trace.screened.length + trace.screenedOut}`} />
            <KV k="Horizon" v={trace.llm.extraction.horizon} />
          </div>
        </div>
      ) : trace ? (
        <div className="p-6 text-[13px] text-ink2">No holding in the book is exposed to this event. Logged, no alert raised.</div>
      ) : null}
    </section>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-1.5 text-[12px]">
      <span className="text-mute">{k}</span>
      <span className="num capitalize" style={{ color: tone }}>
        {v}
      </span>
    </div>
  );
}
