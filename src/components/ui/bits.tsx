"use client";
import { useState, type ReactNode } from "react";
import { OctagonAlert, TriangleAlert, ShieldAlert, ShieldCheck, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Threat } from "@/lib/types";
import { THREAT_META } from "@/lib/risk";

const THREAT_ICON = { CRITICAL: OctagonAlert, ELEVATED: TriangleAlert, GUARDED: ShieldAlert, LOW: ShieldCheck, UPSIDE: TrendingUp };

export function ThreatBadge({ threat, size = "sm" }: { threat: Threat; size?: "sm" | "xs" }) {
  const m = THREAT_META[threat];
  const Icon = THREAT_ICON[threat];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[5px] font-cond font-semibold uppercase tracking-wider ${size === "xs" ? "px-1.5 py-[1px] text-[9.5px]" : "px-2 py-0.5 text-[10.5px]"}`}
      style={{ color: `color-mix(in oklab, ${m.color}, var(--color-ink) var(--status-ink-mix))`, background: `color-mix(in oklab, ${m.color} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${m.color} 35%, transparent)` }}
    >
      <Icon size={size === "xs" ? 10 : 12} strokeWidth={2.4} />
      {threat === "UPSIDE" ? "Upside" : m.label}
    </span>
  );
}

export function Dir({ d, className = "" }: { d: "down" | "up"; className?: string }) {
  return d === "down" ? (
    <ArrowDownRight size={14} className={`inline text-crit ${className}`} aria-label="down" />
  ) : (
    <ArrowUpRight size={14} className={`inline text-up ${className}`} aria-label="up" />
  );
}

export function Logo({ domain, label, size = 20 }: { domain: string; label: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className="inline-grid shrink-0 place-items-center rounded bg-raise font-cond text-[9px] font-bold text-ink2" style={{ width: size, height: size }}>
        {label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
      </span>
    );
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded bg-white/90 p-[2px]"
      style={{ width: size, height: size }}
    />
  );
}

export function PanelHead({ title, sub, right, icon }: { title: string; sub?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="text-mute">{icon}</span>}
        <h2 className="font-cond text-[12px] font-semibold uppercase tracking-[0.09em] text-ink2">{title}</h2>
        {sub && <span className="truncate text-[11.5px] text-mute">{sub}</span>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className="label">{label}</div>
      <div className="num mt-1 text-[22px] font-medium leading-tight" style={{ color: tone }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-mute">{sub}</div>}
    </div>
  );
}

export function LayerTag({ layer }: { layer: "llm" | "jev" | "calc" }) {
  const map = { llm: ["LLM", "var(--color-llm)"], jev: ["JEV", "var(--color-jev)"], calc: ["CALC", "var(--color-accent)"] } as const;
  const [t, c] = map[layer];
  return (
    <span className="rounded px-1.5 py-[1px] font-mono text-[9.5px] font-semibold" style={{ color: c, background: `color-mix(in oklab, ${c} 13%, transparent)` }}>
      {t}
    </span>
  );
}

export function Btn({ children, onClick, tone = "default", className = "", disabled, title }: { children: ReactNode; onClick?: () => void; tone?: "default" | "primary" | "danger" | "ghost"; className?: string; disabled?: boolean; title?: string }) {
  const tones = {
    default: "bg-raise text-ink hover:bg-line2 border border-line2",
    primary: "bg-accent text-on-accent hover:brightness-110 border border-accent",
    danger: "bg-crit/15 text-loss hover:bg-crit/25 border border-crit/40",
    ghost: "text-ink2 hover:text-ink hover:bg-raise border border-transparent",
  };
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition disabled:opacity-40 ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function timeAgo(ms: number, now: number) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour12: false });
