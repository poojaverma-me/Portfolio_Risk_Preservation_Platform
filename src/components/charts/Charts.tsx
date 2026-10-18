"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Area, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Treemap } from "recharts";
import type { Holding, RiskCalc, Threat } from "@/lib/types";
import { MAG_BUCKETS, SYSTEMIC_SCALE } from "@/lib/pipeline/calculus";
import { THREAT_META, pct, usd } from "@/lib/risk";
import { useChartColors } from "@/lib/theme";

function useAxes() {
  const c = useChartColors();
  return {
    c,
    AXIS: { stroke: c.axis, tick: { fill: c.tick, fontSize: 10.5, fontFamily: "var(--font-jb)" } },
    tooltipStyle: { background: c.tipBg, border: `1px solid ${c.tipLine}`, borderRadius: 8, fontSize: 12, color: c.tipInk },
  };
}

/** Semicircular probability gauge. */
export function Gauge({ value, color, label, sub }: { value: number; color: string; label: string; sub?: string }) {
  const r = 70;
  const c = Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 104" className="w-full max-w-[220px]" role="img" aria-label={`${label} ${pct(value)}`}>
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" style={{ stroke: "var(--color-line)" }} strokeWidth="12" strokeLinecap="round" />
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} style={{ transition: "stroke-dasharray .6s ease" }} />
        {[0.25, 0.5, 0.75].map((t) => {
          const a = Math.PI * (1 - t);
          return <line key={t} x1={90 + 58 * Math.cos(a)} y1={94 - 58 * Math.sin(a)} x2={90 + 52 * Math.cos(a)} y2={94 - 52 * Math.sin(a)} style={{ stroke: "var(--color-line2)" }} strokeWidth="1.5" />;
        })}
        <text x="90" y="82" textAnchor="middle" style={{ fill: "var(--color-ink)" }} fontSize="30" fontFamily="var(--font-jb)">
          {Math.round(value * 100)}
          <tspan fontSize="15" style={{ fill: "var(--color-ink2)" }}>%</tspan>
        </text>
      </svg>
      <div className="-mt-1 text-center">
        <div className="label">{label}</div>
        {sub && <div className="text-[11.5px] text-ink2">{sub}</div>}
      </div>
    </div>
  );
}

/** Probability over magnitude buckets (Jev score distribution). */
export function MagnitudeChart({ probs, direction }: { probs: number[]; direction: "down" | "up" }) {
  const data = MAG_BUCKETS.map((b, i) => ({ name: b.hi === 20 ? ">12%" : `${b.lo}–${b.hi}%`, p: probs[i] ?? 0 }));
  const { c, AXIS, tooltipStyle } = useAxes();
  const color = direction === "down" ? c.down : c.up;
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={6}>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="name" {...AXIS} tickLine={false} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} />
        <Tooltip cursor={{ fill: c.cursor }} contentStyle={tooltipStyle} formatter={(v) => [pct(Number(v), 1), "Jev probability"]} />
        <Bar dataKey="p" fill={color} radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Segmented systemic-spread meter from Jev's portfolio-level score. */
export function SystemicMeter({ probs }: { probs: number[] }) {
  const idx = probs.reduce((b, p, i) => (p > probs[b] ? i : b), 0);
  const expected = probs.reduce((s, p, i) => s + p * i, 0) / (SYSTEMIC_SCALE.length - 1);
  return (
    <div>
      <div className="flex gap-[2px]">
        {SYSTEMIC_SCALE.map((s, i) => (
          <div key={s} title={`${s}: ${pct(probs[i] ?? 0)}`} className="h-2 flex-1 rounded-sm" style={{ background: `color-mix(in oklab, var(--color-seq3) ${Math.round(12 + (probs[i] ?? 0) * 88)}%, var(--color-line))` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]">
        <span className="text-ink2">{SYSTEMIC_SCALE[idx]}</span>
        <span className="num text-mute">index {expected.toFixed(2)}</span>
      </div>
    </div>
  );
}

/** Confidence interval strip: P10–P90 band, P25–P75 core, expected tick. 0–20% scale. */
export function CIBar({ r }: { r: RiskCalc }) {
  const max = 20;
  const x = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const color = r.direction === "down" ? "var(--color-chart-down)" : "var(--color-chart-up)";
  return (
    <div className="relative h-4 w-full min-w-[96px]" title={`P10–P90 ${r.ci[0].toFixed(1)}–${r.ci[1].toFixed(1)}% · P25–P75 ${r.range[0].toFixed(1)}–${r.range[1].toFixed(1)}% · E ${r.expectedMovePct.toFixed(1)}%`}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-line2" />
      <div className="absolute top-[5px] h-[6px] rounded-full opacity-35" style={{ left: x(r.ci[0]), width: `calc(${x(r.ci[1])} - ${x(r.ci[0])})`, background: color }} />
      <div className="absolute top-[4px] h-[8px] rounded-full" style={{ left: x(r.range[0]), width: `calc(${x(r.range[1])} - ${x(r.range[0])})`, background: color }} />
      <div className="absolute top-[1px] h-[14px] w-[2px] rounded bg-ink" style={{ left: x(r.expectedMovePct) }} />
    </div>
  );
}

/** Holdings × events heatmap of signed probability-weighted move. Diverging red ↔ blue, gray at zero. */
export function Heatmap({ rows, cols, cell, onPick }: { rows: Holding[]; cols: { uid: string; label: string }[]; cell: (ticker: string, uid: string) => RiskCalc | undefined; onPick?: (uid: string, ticker: string) => void }) {
  const [hover, setHover] = useState<{ t: string; u: string } | null>(null);
  const hv = hover ? cell(hover.t, hover.u) : undefined;
  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="w-[92px]" />
              {cols.map((c) => (
                <th key={c.uid} className="h-[86px] min-w-[30px] align-bottom">
                  <div className="mx-auto w-[14px] origin-bottom-left translate-x-[10px] -rotate-[50deg] whitespace-nowrap text-left font-cond text-[10px] font-medium text-mute">{c.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.ticker}>
                <td className="num whitespace-nowrap pr-2 text-right text-[10.5px] text-ink2">{h.ticker}</td>
                {cols.map((c) => {
                  const r = cell(h.ticker, c.uid);
                  const sev = r ? Math.min(1, (r.probability * r.expectedMovePct * (1 - r.hedgeRatio)) / 7) : 0;
                  const hue = r?.direction === "up" ? "var(--color-chart-up)" : "var(--color-chart-down)";
                  return (
                    <td
                      key={c.uid}
                      onMouseEnter={() => setHover({ t: h.ticker, u: c.uid })}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => r && onPick?.(c.uid, h.ticker)}
                      className={`h-[18px] rounded-[3px] ${r ? "cursor-pointer" : ""} ${hover?.t === h.ticker && hover?.u === c.uid ? "outline outline-1 outline-ink" : ""}`}
                      style={{ background: r ? `color-mix(in oklab, ${hue} ${Math.round(20 + sev * 80)}%, var(--color-heat-mid))` : "var(--color-heat-empty)" }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[10.5px] text-mute">
        <div className="flex items-center gap-1.5">
          <span>Down</span>
          <span className="h-2 w-24 rounded-sm" style={{ background: "linear-gradient(90deg,var(--color-chart-down),var(--color-heat-mid),var(--color-chart-up))" }} />
          <span>Up</span>
          <span className="ml-2">intensity = probability × expected move</span>
        </div>
        <div className="num text-ink2">{hover ? (hv ? `${hover.t}: ${hv.direction === "down" ? "↓" : "↑"} ${pct(hv.probability)} · E ${hv.expectedMovePct.toFixed(1)}% · ${usd(hv.expectedLoss)} at risk` : `${hover.t}: not exposed`) : "hover a cell"}</div>
      </div>
    </div>
  );
}

// Treemap severity uses the single-hue blue ramp (deeper = worse); upside uses the yellow pole.
const TREE_FILL: Record<Threat, string> = {
  CRITICAL: "var(--color-seq4)",
  ELEVATED: "var(--color-seq3)",
  GUARDED: "var(--color-seq2)",
  LOW: "var(--color-seq1)",
  UPSIDE: "var(--color-chart-up)",
};

export function TreeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-mute">
      {(["CRITICAL", "ELEVATED", "GUARDED", "LOW", "UPSIDE"] as Threat[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: `color-mix(in oklab, ${TREE_FILL[t]} 42%, var(--color-panel2))`, boxShadow: `inset 0 0 0 1px ${TREE_FILL[t]}` }} />
          {THREAT_META[t].label}
        </span>
      ))}
    </div>
  );
}

/** Portfolio treemap sized by position value, coloured by worst active threat. */
export function BookTreemap({ holdings, threatOf, onPick }: { holdings: Holding[]; threatOf: (t: string) => Threat | undefined; onPick?: (t: string) => void }) {
  const data = holdings
    .map((h) => ({ name: h.ticker, size: h.shares * h.price, threat: threatOf(h.ticker) }))
    .sort((a, b) => b.size - a.size);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap data={data} dataKey="size" isAnimationActive={false} content={<TreeCell onPick={onPick} />} />
    </ResponsiveContainer>
  );
}

function TreeCell(props: { x?: number; y?: number; width?: number; height?: number; name?: string; size?: number; threat?: Threat; onPick?: (t: string) => void }) {
  const { x = 0, y = 0, width = 0, height = 0, name, size = 0, threat, onPick } = props;
  if (width < 2 || height < 2 || !name) return null;
  const tColor = threat ? TREE_FILL[threat] : undefined;
  return (
    <g onClick={() => onPick?.(name)} style={{ cursor: "pointer" }}>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} rx={4} style={{ fill: tColor ? `color-mix(in oklab, ${tColor} 42%, var(--color-panel2))` : "var(--color-panel2)", stroke: "var(--color-bg)" }} strokeWidth={2} />
      {width > 46 && height > 26 && (
        <>
          <text x={x + 10} y={y + 17} style={{ fill: "var(--color-ink)" }} fontSize={11.5} fontFamily="var(--font-jb)" fontWeight={600}>
            {name}
          </text>
          {height > 40 && (
            <text x={x + 10} y={y + 31} style={{ fill: "var(--color-ink2)" }} fontSize={10} fontFamily="var(--font-jb)">
              {usd(size)}
            </text>
          )}
          {threat && height > 54 && width > 70 && (
            <text x={x + 10} y={y + 45} style={{ fill: "var(--color-ink2)" }} fontSize={9.5} fontFamily="var(--font-plex-cond)" fontWeight={600} letterSpacing={0.8}>
              {THREAT_META[threat].short}
            </text>
          )}
        </>
      )}
    </g>
  );
}

/** Modelled post-event trajectory with P10–P90 band. Synthetic, analog-calibrated shape. */
export function Trajectory({ r, horizon, seed }: { r: RiskCalc; horizon: "intraday" | "days" | "weeks" | "months"; seed: string }) {
  const { c, AXIS, tooltipStyle } = useAxes();
  const tau = { intraday: 0.6, days: 1.6, weeks: 4, months: 7 }[horizon];
  const sign = r.direction === "down" ? -1 : 1;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5);
  let walk = 0;
  const data = [];
  for (let d = -5; d <= 10; d++) {
    if (d < 0) {
      walk += rnd() * 0.9;
      data.push({ d, median: +walk.toFixed(2), band: [walk - 0.3, walk + 0.3] as [number, number] });
      continue;
    }
    const f = 1 - Math.exp(-(d + 0.4) / tau);
    const hedge = 1 - r.hedgeRatio;
    const med = walk + sign * r.expectedMovePct * r.probability * f * hedge + rnd() * 0.25;
    const deep = walk + sign * r.ci[1] * f * hedge;
    const shallow = walk + sign * r.ci[0] * f * hedge * r.probability - sign * (1 - r.probability) * 1.5 * f;
    data.push({ d, median: +med.toFixed(2), band: [Math.min(deep, shallow), Math.max(deep, shallow)] as [number, number] });
  }
  const color = r.direction === "down" ? c.down : c.up;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -14 }}>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="d" {...AXIS} tickLine={false} tickFormatter={(v) => (v === 0 ? "T" : v > 0 ? `+${v}d` : `${v}d`)} />
        <YAxis {...AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(v) => (v === 0 ? "Event day" : `Day ${v}`)}
          formatter={(v, n) => (n === "band" && Array.isArray(v) ? [`${Number(v[0]).toFixed(1)}% to ${Number(v[1]).toFixed(1)}%`, "P10–P90 band"] : [`${Number(v).toFixed(2)}%`, "Median path"])}
        />
        <Area dataKey="band" stroke="none" fill={color} fillOpacity={0.16} isAnimationActive={false} />
        <Line dataKey="median" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        <ReferenceLine x={0} stroke={c.ref} strokeWidth={1} label={{ value: "event", fill: c.ref, fontSize: 10, position: "insideTopRight" }} />
        <ReferenceLine y={0} stroke={c.axis} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
