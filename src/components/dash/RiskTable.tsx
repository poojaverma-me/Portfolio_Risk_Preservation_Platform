"use client";
import { Shield, ShieldOff } from "lucide-react";
import type { Holding, RiskCalc } from "@/lib/types";
import { classify } from "@/lib/jev/classify";
import { fmtRange } from "@/lib/pipeline/calculus";
import { pct, usd } from "@/lib/risk";
import { useStore } from "@/lib/store";
import { CIBar } from "../charts/Charts";
import { Dir, Logo, ThreatBadge } from "../ui/bits";

export function RiskTable({ risks, holdings, selected, onSelect, compact }: { risks: RiskCalc[]; holdings: Holding[]; selected?: string | null; onSelect?: (t: string) => void; compact?: boolean }) {
  const by = Object.fromEntries(holdings.map((h) => [h.ticker, h]));
  const { hedges, set, toast } = useStore();
  if (!risks.length) return <div className="px-4 py-6 text-[12.5px] text-mute">No exposed holdings.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left">
            {["Holding", ...(compact ? [] : ["JEV class"]), "Threat", "Dir · prob", "Range", "CI P10–P90", "Exp. loss", ...(compact ? [] : ["Transmission mechanism"]), "Hedge"].map((h) => (
              <th key={h} className="label whitespace-nowrap border-b border-line px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {risks.map((r) => {
            const h = by[r.ticker];
            if (!h) return null;
            const c = classify(h);
            const hedged = (hedges[r.ticker] ?? 0) > 0;
            return (
              <tr key={r.ticker} onClick={() => onSelect?.(r.ticker)} className={`cursor-pointer border-b border-line/70 transition hover:bg-raise/60 ${selected === r.ticker ? "bg-raise" : ""}`}>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Logo domain={h.domain} label={h.ticker} size={18} />
                    <div className="leading-tight">
                      <div className="num font-semibold text-ink">{h.ticker}</div>
                      <div className="max-w-[96px] truncate text-[10.5px] text-mute">{compact ? <span className="num text-jev">{c.code}</span> : h.name}</div>
                    </div>
                  </div>
                </td>
                {!compact && <td className="num whitespace-nowrap px-2 py-2 text-[10.5px] text-ink2">
                  {c.code}
                  <div className="text-mute">
                    {h.exchange} · {c.region}
                  </div>
                </td>}
                <td className="px-2 py-2">
                  <ThreatBadge threat={r.threat} size="xs" />
                  <div className="mt-0.5 text-[10px] capitalize text-mute">{r.link} link</div>
                </td>
                <td className="num whitespace-nowrap px-2 py-2">
                  <Dir d={r.direction} /> {pct(r.probability)}
                </td>
                <td className="num whitespace-nowrap px-2 py-2">{fmtRange(r.range)}</td>
                <td className="px-2 py-2">
                  <CIBar r={r} />
                </td>
                <td className="num whitespace-nowrap px-2 py-2" style={{ color: r.expectedLoss > 0 ? "var(--color-loss)" : undefined }}>
                  {r.direction === "down" ? usd(r.expectedLoss) : "—"}
                  <div className="text-[10px] text-mute">of {usd(r.positionValue)}</div>
                </td>
                {!compact && <td className="min-w-[260px] max-w-[360px] px-2 py-2 text-[11.5px] leading-snug text-ink2">{r.mechanism.join(" → ")}</td>}
                <td className="px-2 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = { ...hedges, [r.ticker]: hedged ? 0 : 0.6 };
                      set({ hedges: next });
                      toast(hedged ? `Hedge removed on ${r.ticker}` : `60% put-collar hedge on ${r.ticker} (simulated)`, hedged ? "info" : "good");
                    }}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${hedged ? "bg-good/15 text-hedge" : "bg-raise text-ink2 hover:text-ink"}`}
                    title={hedged ? "Remove hedge" : "Hedge 60% of notional"}
                  >
                    {hedged ? <Shield size={12} /> : <ShieldOff size={12} />}
                    {hedged ? `${Math.round((hedges[r.ticker] ?? 0) * 100)}%` : "Hedge"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
