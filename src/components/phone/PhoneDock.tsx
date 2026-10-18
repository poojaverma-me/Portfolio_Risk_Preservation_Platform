"use client";
import { useEffect, useRef, useState } from "react";
import { X, Signal, Wifi, BatteryFull, ShieldHalf, ArrowDownRight, ArrowUpRight, Timer, ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useBook, useNow } from "@/lib/hooks";
import type { Alert } from "@/lib/types";
import { fmtRange } from "@/lib/pipeline/calculus";
import { THREAT_META, pct, usd } from "@/lib/risk";
import { ThreatBadge, timeAgo } from "../ui/bits";

// Pin dark-mode tokens inside the device so it reads the same in light mode.
const DEVICE_TOKENS = { "--color-up": "#d8e63c", "--color-ink": "#f0eee9", "--color-jev": "#d6b4fc", "--status-ink-mix": "0%" } as React.CSSProperties;

// The device is always dark, so upside uses the fixed palette yellow, not the themed token.
const phoneTone = (t: Alert["threat"]) => (t === "UPSIDE" ? "#d8e63c" : THREAT_META[t].color);

export function PhoneDock() {
  const { alerts, set } = useStore();
  const now = useNow();
  const visible = alerts.filter((a) => a.status !== "dismissed");
  const delivered = alerts.map((a) => a.deliveredMs).sort((a, b) => a - b);
  const p50 = delivered.length ? delivered[Math.floor(delivered.length / 2)] : 0;
  const [buzzKey, setBuzzKey] = useState(0);
  const lastTop = useRef<string | undefined>(alerts[0]?.uid);
  useEffect(() => {
    if (alerts[0]?.uid && alerts[0].uid !== lastTop.current) {
      lastTop.current = alerts[0].uid;
      setBuzzKey((k) => k + 1);
    }
  }, [alerts]);

  return (
    <aside className="fixed bottom-0 right-0 top-[52px] z-50 flex w-[352px] shrink-0 flex-col border-l border-line bg-panel shadow-[-20px_0_60px_-20px_rgba(0,0,0,.7)] xl:static xl:z-auto xl:shadow-none">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div>
          <div className="font-cond text-[12px] font-semibold uppercase tracking-[0.09em] text-ink2">Mobile push · simulated</div>
          <div className="text-[11px] text-mute">
            SLA &lt; 60 s · median ingest→push <span className="num text-ink2">{p50 ? `${(p50 / 1000).toFixed(1)}s` : "—"}</span>
          </div>
        </div>
        <button onClick={() => set({ phoneOpen: false })} className="text-mute hover:text-ink" aria-label="Close phone">
          <X size={16} />
        </button>
      </div>
      <div className="grid flex-1 place-items-center overflow-y-auto p-4">
        <div key={buzzKey} className={`${buzzKey ? "buzz" : ""} relative h-[640px] w-[304px] rounded-[48px] bg-[#1a1b26] p-[9px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8),inset_0_0_0_1.5px_#3a3d52]`}>
          <div className="relative h-full w-full overflow-hidden rounded-[40px] grad-05" style={DEVICE_TOKENS}>
            <div className="absolute left-1/2 top-[10px] z-30 h-[28px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
            <div className="relative z-20 flex items-center justify-between px-7 pt-[14px] text-[12.5px] font-semibold text-white">
              <span className="num">{new Date(now).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false })}</span>
              <span className="flex items-center gap-1">
                <Signal size={13} />
                <Wifi size={13} />
                <BatteryFull size={16} />
              </span>
            </div>
            <Screen alerts={visible} now={now} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function Screen({ alerts, now }: { alerts: Alert[]; now: number }) {
  const { openAlertUid, set } = useStore();
  const open = alerts.find((a) => a.uid === openAlertUid);
  if (open) return <Briefing alert={open} onBack={() => set({ openAlertUid: null })} />;
  const d = new Date(now);
  return (
    <div className="absolute inset-0 flex flex-col pt-[52px]">
      <div className="text-center text-white">
        <div className="text-[13px] font-medium opacity-80">{d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <div className="font-cond text-[64px] font-semibold leading-none tracking-tight">{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false })}</div>
      </div>
      <div className="mt-5 flex-1 space-y-2 overflow-y-auto px-3 pb-10">
        {alerts.length === 0 && <div className="mt-10 text-center text-[12px] text-white/50">No alerts. Bastion is watching your active feeds.</div>}
        {alerts.slice(0, 8).map((a, i) => (
          <button
            key={a.uid}
            onClick={() => {
              set({ openAlertUid: a.uid, selectedUid: a.uid });
              if (a.status === "new") useStore.getState().set({ alerts: useStore.getState().alerts.map((x) => (x.uid === a.uid ? { ...x, status: "read" } : x)) });
            }}
            className={`glass ${i === 0 ? "slide-in" : ""} block w-full rounded-[18px] px-3 py-2.5 text-left text-white`}
          >
            <div className="flex items-center gap-2 text-[11px]">
              <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-[#10111a]">
                <ShieldHalf size={12} style={{ color: phoneTone(a.threat) }} />
              </span>
              <span className="font-semibold tracking-wide opacity-90">BASTION</span>
              {a.origin && a.origin !== "stream" && <span className="rounded bg-[#d6b4fc]/35 px-1 text-[9px] font-semibold uppercase tracking-wider text-[#f0eee9]">stress test</span>}
              {a.status === "new" && <span className="h-1.5 w-1.5 rounded-full bg-[#d8e63c]" />}
              <span className="ml-auto opacity-60">{timeAgo(a.createdAt, now)}</span>
            </div>
            <div className="mt-1 text-[13px] font-semibold leading-snug">
              <span style={{ color: phoneTone(a.threat) }}>{a.threat === "UPSIDE" ? "VOLATILITY" : a.threat}</span> · {a.title}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug opacity-85">
              {a.tickers.map((t) => `${t.ticker} ${t.direction === "down" ? "↓" : "↑"}${pct(t.probability)} ${fmtRange(t.range)}`).join(" · ")}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10.5px] opacity-55">
              <Timer size={10} /> pushed {(a.deliveredMs / 1000).toFixed(1)}s after ingest
              {a.status === "hedged" && " · hedged"}
              {a.status === "reduced" && " · exposure reduced"}
            </div>
          </button>
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 h-[5px] w-[120px] -translate-x-1/2 rounded-full bg-white/70" />
    </div>
  );
}

function Briefing({ alert, onBack }: { alert: Alert; onBack: () => void }) {
  const book = useBook();
  const entry = book.active.find((a) => a.ev.uid === alert.uid);
  const risks = (entry?.risks ?? []).filter((r) => r.threat !== "LOW");
  const downs = risks.filter((r) => r.direction === "down");
  const loss = risks.reduce((s, r) => s + r.expectedLoss, 0);

  const act = (kind: "hedged" | "reduced" | "dismissed") => {
    const s = useStore.getState();
    if (kind === "hedged") {
      const targets = downs.length ? downs : risks;
      const hedges = { ...s.hedges };
      for (const r of targets) hedges[r.ticker] = Math.max(hedges[r.ticker] ?? 0, 0.6);
      s.set({ hedges });
      s.toast(`Protective put collars on ${targets.map((r) => r.ticker).join(", ")}: 60% of notional hedged (simulated order)`, "good");
    }
    if (kind === "reduced") {
      const targets = downs.length ? downs : risks;
      const set = new Set(targets.map((r) => r.ticker));
      s.set({ holdings: s.holdings.map((h) => (set.has(h.ticker) ? { ...h, shares: Math.round(h.shares * 0.75) } : h)) });
      s.toast(`Sell orders staged: −25% in ${[...set].join(", ")} (simulated)`, "good");
    }
    if (kind === "dismissed") s.toast(`Alert dismissed: ${alert.title}`, "info");
    s.set({ alerts: s.alerts.map((a) => (a.uid === alert.uid ? { ...a, status: kind } : a)), openAlertUid: null });
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-[#10111a] pt-[48px] text-white">
      <div className="flex items-center gap-1 px-3 text-[13px] text-[#d8e63c]">
        <button onClick={onBack} className="flex items-center">
          <ChevronLeft size={18} /> Alerts
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <ThreatBadge threat={alert.threat} />
        <h3 className="mt-2 text-[17px] font-semibold leading-tight">{alert.title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-snug text-white/75">{alert.summary}</p>
        <div className="mt-3 rounded-xl bg-white/[0.06] p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10.5px] uppercase tracking-wider text-white/50">Expected loss</span>
            <span className="num text-[15px] text-[#ff9a9a]">{usd(loss)}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {risks.slice(0, 5).map((r) => (
              <div key={r.ticker} className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-1 font-semibold">
                  {r.direction === "down" ? <ArrowDownRight size={13} className="text-crit" /> : <ArrowUpRight size={13} className="text-up" />}
                  {r.ticker}
                  {r.hedgeRatio > 0 && <span className="rounded bg-good/20 px-1 text-[9px] text-[#6be06b]">H{Math.round(r.hedgeRatio * 100)}</span>}
                </span>
                <span className="num text-white/80">
                  {pct(r.probability)} · {fmtRange(r.range)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {risks[0] && (
          <div className="mt-3 text-[11.5px] leading-snug text-white/60">
            <span className="text-white/40">Why {risks[0].ticker}: </span>
            {risks[0].mechanism.join(" → ")}
          </div>
        )}
        <div className="mt-2 text-[10.5px] text-white/40">Pushed {(alert.deliveredMs / 1000).toFixed(1)}s after ingest · status {alert.status}</div>
      </div>
      <div className="grid gap-2 px-3 pb-6">
        <button onClick={() => act("hedged")} className="rounded-xl bg-[#d8e63c] py-2.5 text-[13.5px] font-semibold text-[#17184b]">
          Hedge Position
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => act("reduced")} className="rounded-xl bg-white/10 py-2.5 text-[13px] font-semibold">
            Reduce Exposure
          </button>
          <button onClick={() => act("dismissed")} className="rounded-xl bg-white/5 py-2.5 text-[13px] font-medium text-white/70">
            Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
}
