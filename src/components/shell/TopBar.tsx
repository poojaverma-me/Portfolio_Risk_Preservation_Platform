"use client";
import { useEffect, useState } from "react";
import { Pause, Play, Smartphone, Crown, Sun, Moon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useBook, useNow } from "@/lib/hooks";
import { FUND } from "@/lib/data/universe";
import { PROFILES, FREE_FEED_LIMIT } from "@/lib/data/feeds";
import { usd } from "@/lib/risk";

interface Status {
  llm: { live: boolean; model: string; reason: string };
  jev: { live: boolean; model: string };
}

export function TopBar() {
  const now = useNow();
  const book = useBook();
  const { tier, setTier, live, set, intervalSec, profileId, applyProfile, activeFeeds, phoneOpen, alerts, theme } = useStore();
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);
  const unread = alerts.filter((a) => a.status === "new").length;
  const postureTone = book.posture >= 80 ? "var(--color-accent)" : book.posture >= 60 ? "var(--color-warn)" : book.posture >= 40 ? "var(--color-serious)" : "var(--color-crit)";

  return (
    <header className="flex min-w-0 items-center gap-4 border-b border-line bg-panel px-4">
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="text-grad font-cond text-[15px] font-bold tracking-[0.22em]">BASTION</span>
        <span className="hidden truncate text-[12px] text-mute xl:inline">{FUND.name}</span>
      </div>

      <div className="ml-2 hidden items-center gap-5 border-l border-line pl-5 lg:flex">
        <Metric label="NAV" value={usd(book.nav, 2)} />
        <Metric label="Event VaR" value={usd(book.eventVar)} tone={book.eventVar > 0 ? "var(--color-serious)" : undefined} />
        <Metric label="Posture" value={`${book.posture}`} tone={postureTone} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <select
          value={profileId ?? ""}
          onChange={(e) => applyProfile(e.target.value)}
          className="h-8 rounded-md border border-line2 bg-raise px-2 text-[12px] text-ink outline-none"
          aria-label="Monitoring profile"
        >
          {profileId === null && <option value="">Custom ({activeFeeds.length} feeds)</option>}
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.premium && tier === "free" ? "🔒 " : ""}
              {p.name}
            </option>
          ))}
        </select>

        <div className="flex h-8 items-center rounded-md border border-line2 bg-raise p-0.5 text-[11.5px]">
          {(["free", "enterprise"] as const).map((t) => (
            <button key={t} onClick={() => setTier(t)} className={`flex h-full items-center gap-1 rounded px-2.5 font-medium capitalize ${tier === t ? "bg-line2 text-ink" : "text-mute hover:text-ink"}`}>
              {t === "enterprise" && <Crown size={11} className={tier === t ? "text-warn" : ""} />}
              {t === "free" ? `Free · ${FREE_FEED_LIMIT}` : "Enterprise"}
            </button>
          ))}
        </div>

        <button
          onClick={() => set({ live: !live })}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium ${live ? "border-accent/40 bg-accent/10 text-accent" : "border-line2 bg-raise text-mute"}`}
          title="Toggle simulated live stream"
        >
          {live ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" /> : <Pause size={12} />}
          {live ? "LIVE" : "PAUSED"}
          {live ? <Pause size={11} className="opacity-60" /> : <Play size={11} />}
        </button>
        <select value={intervalSec} onChange={(e) => set({ intervalSec: Number(e.target.value) })} className="h-8 rounded-md border border-line2 bg-raise px-1.5 text-[11.5px] text-ink2 outline-none" aria-label="Stream interval">
          {[15, 30, 45, 60, 120].map((s) => (
            <option key={s} value={s}>
              every {s}s
            </option>
          ))}
        </select>

        <div className="hidden items-center gap-1.5 2xl:flex">
          <Pill on={status?.llm.live} label="LLM" color="var(--color-llm)" title={status ? `${status.llm.model}: ${status.llm.reason}` : "checking…"} offLabel="curated" />
          <Pill on={status?.jev.live} label="JEV" color="var(--color-jev)" title={status ? `${status.jev.model}` : "checking…"} offLabel="fallback" />
        </div>

        <span className="num hidden w-[64px] text-right text-[12px] text-ink2 md:inline">{new Date(now).toLocaleTimeString("en-GB", { hour12: false })}</span>

        <button
          onClick={() => set({ theme: theme === "dark" ? "light" : "dark" })}
          className="grid h-8 w-8 place-items-center rounded-md border border-line2 bg-raise text-ink2 hover:text-ink"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle colour mode"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button onClick={() => set({ phoneOpen: !phoneOpen })} className={`relative grid h-8 w-8 place-items-center rounded-md border ${phoneOpen ? "border-accent/50 bg-accent/10 text-accent" : "border-line2 bg-raise text-ink2"}`} title="Mobile alerts">
          <Smartphone size={15} />
          {unread > 0 && <span className="num absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-crit px-1 text-[9.5px] font-bold text-white">{unread}</span>}
        </button>
      </div>
    </header>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="leading-tight">
      <div className="label !text-[9.5px]">{label}</div>
      <div className="num text-[13.5px]" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function Pill({ on, label, color, title, offLabel }: { on?: boolean; label: string; color: string; title: string; offLabel: string }) {
  return (
    <span title={title} className="flex h-8 items-center gap-1.5 rounded-md border border-line2 bg-raise px-2 font-mono text-[10.5px]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? color : "var(--color-mute)" }} />
      <span style={{ color: on ? color : "var(--color-mute)" }}>{label}</span>
      <span className="text-mute">{on ? "live" : offLabel}</span>
    </span>
  );
}
