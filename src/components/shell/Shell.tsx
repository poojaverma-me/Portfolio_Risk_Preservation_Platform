"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { applyTheme } from "@/lib/theme";
import { fireEvent, nextStreamEvent, rescoreOpenEvents } from "@/lib/engine";
import { EVENTS } from "@/lib/data/events";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import { Toasts, UpgradeModal } from "./Overlays";
import { PhoneDock } from "../phone/PhoneDock";

export function Shell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).then(() => setReady(true));
  }, []);
  if (!ready) return <div className="grid h-screen place-items-center font-cond text-sm uppercase tracking-[0.2em] text-mute">Bastion · loading book</div>;
  return <Ready>{children}</Ready>;
}

function Ready({ children }: { children: ReactNode }) {
  useLiveStream();
  useRescoreOnBookChange();
  const theme = useStore((s) => s.theme);
  useEffect(() => applyTheme(theme), [theme]);
  const phoneOpen = useStore((s) => s.phoneOpen);
  return (
    <div className="grid h-screen grid-cols-[60px_minmax(0,1fr)] grid-rows-[52px_minmax(0,1fr)] overflow-hidden">
      <Rail />
      <TopBar />
      <div className="flex min-h-0 min-w-0">
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        {phoneOpen && <PhoneDock />}
      </div>
      <Toasts />
      <UpgradeModal />
    </div>
  );
}

/** Simulated intelligence stream: emits a preset from an active feed every N seconds. */
function useLiveStream() {
  const live = useStore((s) => s.live);
  const intervalSec = useStore((s) => s.intervalSec);
  const recent = useRef<string[]>([]);
  useEffect(() => {
    if (!live) return;
    const tick = () => {
      const s = useStore.getState();
      if (document.hidden && s.events.length) return;
      const ev = nextStreamEvent(EVENTS, s.activeFeeds, recent.current);
      if (!ev) return;
      recent.current = [ev.id, ...recent.current].slice(0, 8);
      fireEvent(ev, "stream");
    };
    // Resume the cadence from the last stream event (survives reloads); an empty
    // book gets its first event quickly so the demo comes alive.
    const lastStream = useStore.getState().events.find((e) => e.origin === "stream")?.firedAt ?? 0;
    const firstIn = Math.max(2500, intervalSec * 1000 - (Date.now() - lastStream));
    let t: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      tick();
      t = setInterval(tick, intervalSec * 1000);
    }, firstIn);
    return () => {
      clearTimeout(first);
      if (t) clearInterval(t);
    };
  }, [live, intervalSec]);
}

function useRescoreOnBookChange() {
  const sig = useStore((s) => s.holdings.map((h) => `${h.ticker}:${h.industry}:${h.tags.join("+")}`).join("|"));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => rescoreOpenEvents(), 700);
    return () => clearTimeout(t);
  }, [sig]);
}
