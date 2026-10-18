"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Zap, Send, Layers, ScanSearch } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { fireEvent } from "@/lib/engine";
import { EVENTS } from "@/lib/data/events";
import { FEEDS, FEED_BY_ID } from "@/lib/data/feeds";
import { eventRisks, navOf, usd, pct } from "@/lib/risk";
import { worstThreat } from "@/lib/pipeline/calculus";
import type { NewsEvent } from "@/lib/types";
import { RiskTable } from "@/components/dash/RiskTable";
import { Btn, Logo, PanelHead, ThreatBadge } from "@/components/ui/bits";

export default function StressLab() {
  const { events, traces, holdings, hedges, pending, llmMode, set } = useStore(
    useShallow((s) => ({ events: s.events, traces: s.traces, holdings: s.holdings, hedges: s.hedges, pending: s.pending, llmMode: s.llmMode, set: s.set }))
  );
  const [lastUid, setLastUid] = useState<string | null>(null);
  const [feedId, setFeedId] = useState("x-trump");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);

  const nav = navOf(holdings);
  const last = events.find((e) => e.uid === lastUid);
  const risks = useMemo(() => eventRisks(last, last ? traces[last.uid] : undefined, holdings, hedges, nav), [last, traces, holdings, hedges, nav]);

  const run = async (e: NewsEvent) => {
    const uid = fireEvent(e, e.id.startsWith("custom") ? "custom" : "stress");
    setLastUid(await uid);
  };

  // Stress-run every preset against the current book and rank by expected loss.
  const runAll = async () => {
    setBatchRunning(true);
    for (const e of EVENTS) {
      await fireEvent(e, "stress");
    }
    setBatchRunning(false);
    set({ selectedUid: null });
  };

  const stressRows = useMemo(
    () =>
      events
        .filter((e) => e.origin !== "stream" && traces[e.uid])
        .map((e) => {
          const r = eventRisks(e, traces[e.uid], holdings, hedges, nav);
          return { e, loss: r.reduce((s, x) => s + x.expectedLoss, 0), n: r.length, threat: r.length ? worstThreat(r.map((x) => x.threat)) : ("LOW" as const) };
        })
        .sort((a, b) => b.loss - a.loss),
    [events, traces, holdings, hedges, nav]
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em]">
            <FlaskConical size={16} className="text-jev" /> Stress Lab
          </h1>
          <p className="text-[12.5px] text-mute">Fire synthetic breaking-news scenarios through the full LLM → Jev pipeline against your current book. Every scenario is simulated.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[12px] text-ink2">
            LLM layer
            <select value={llmMode} onChange={(e) => set({ llmMode: e.target.value as "auto" | "curated" })} className="h-8 rounded-md border border-line2 bg-raise px-2 text-[12px] outline-none">
              <option value="auto">Auto (live if key set)</option>
              <option value="curated">Curated analyses only</option>
            </select>
          </label>
          <Btn tone="primary" onClick={runAll} disabled={batchRunning}>
            <Layers size={13} /> {batchRunning ? "Running all scenarios…" : `Run all ${EVENTS.length} scenarios`}
          </Btn>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <PanelHead title="Breaking-news presets" sub={`${EVENTS.length} scenarios across ${new Set(EVENTS.map((e) => e.feedId)).size} sources`} icon={<Zap size={14} />} />
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
          {EVENTS.map((e) => {
            const f = FEED_BY_ID[e.feedId];
            return (
              <button key={e.id} onClick={() => run(e)} className="group rounded-lg border border-line bg-panel2 p-3 text-left transition hover:border-line2 hover:bg-raise">
                <div className="flex items-center gap-2 text-[10.5px] text-mute">
                  <Logo domain={f.domain} label={f.name} size={14} />
                  {f.name}
                  <Zap size={12} className="ml-auto text-jev opacity-0 transition group-hover:opacity-100" />
                </div>
                <div className="mt-1.5 text-[13px] font-semibold text-ink">{e.label}</div>
                <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink2">{e.headline}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <PanelHead title="Compose a custom event" icon={<Send size={14} />} />
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="label">Source</span>
              <select value={feedId} onChange={(e) => setFeedId(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line2 bg-raise px-2 text-[12.5px] outline-none">
                {FEEDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} · {f.handle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Headline</span>
              <textarea value={headline} onChange={(e) => setHeadline(e.target.value)} rows={3} placeholder="e.g. Pentagon cancels $4B satellite launch contract with Rocket Lab over Neutron delays" className="mt-1 w-full resize-none rounded-md border border-line2 bg-raise p-2.5 text-[13px] outline-none placeholder:text-mute focus:border-accent/60" />
            </label>
            <label className="block">
              <span className="label">Detail (optional)</span>
              <input value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line2 bg-raise px-2.5 text-[12.5px] outline-none focus:border-accent/60" />
            </label>
            <Btn
              tone="primary"
              disabled={headline.trim().length < 12}
              onClick={() => {
                run({ id: `custom-${Date.now().toString(36)}`, feedId, headline: headline.trim(), body: body.trim() || "Custom stress scenario.", label: headline.trim().split(/\s+/).slice(0, 5).join(" ") });
                setHeadline("");
                setBody("");
              }}
            >
              <Send size={13} /> Run through pipeline
            </Btn>
            <p className="text-[11px] leading-snug text-mute">With an Anthropic key set the live LLM analyses your text; otherwise a transparent keyword heuristic stands in (shown in the trace). Jev always scores live.</p>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <PanelHead
            title="Scenario result"
            sub={last ? last.label : "fire a preset or compose an event"}
            right={
              last && (
                <Link href="/trace" onClick={() => set({ selectedUid: last.uid })} className="flex items-center gap-1 text-[11.5px] text-accent">
                  <ScanSearch size={13} /> Trace
                </Link>
              )
            }
          />
          {last && pending[last.uid] ? <div className="scan relative overflow-hidden px-4 py-8 text-[12.5px] text-ink2">Running LLM extraction and Jev scoring…</div> : last ? <RiskTable risks={risks} holdings={holdings} compact /> : <div className="px-4 py-8 text-[12.5px] text-mute">No scenario run yet.</div>}
        </section>
      </div>

      {stressRows.length > 0 && (
        <section className="panel overflow-hidden">
          <PanelHead title="Scenario league table" sub="ranked by expected loss on the current book (after hedges)" />
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left">
                {["Scenario", "Source", "Worst threat", "Exposed", "Expected loss", "% NAV"].map((h) => (
                  <th key={h} className="label border-b border-line px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stressRows.map(({ e, loss, n, threat }) => (
                <tr key={e.uid} onClick={() => setLastUid(e.uid)} className="cursor-pointer border-b border-line/60 hover:bg-raise/60">
                  <td className="px-4 py-2 text-ink">{e.label}</td>
                  <td className="px-4 py-2 text-ink2">{FEED_BY_ID[e.feedId].name}</td>
                  <td className="px-4 py-2">
                    <ThreatBadge threat={threat} size="xs" />
                  </td>
                  <td className="num px-4 py-2">{n}</td>
                  <td className="num px-4 py-2 text-loss">{usd(loss)}</td>
                  <td className="num px-4 py-2">{pct(loss / (nav || 1), 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
