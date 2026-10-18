"use client";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../store";
import { bookOf } from "../risk";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useBook() {
  const s = useStore(useShallow((s) => ({ holdings: s.holdings, events: s.events, traces: s.traces, alerts: s.alerts, hedges: s.hedges })));
  const minute = Math.floor(useNow(30_000) / 30_000); // lets stale alerts age out of the book
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => bookOf(s), [s, minute]);
}

export function useSelected() {
  const { events, traces, selectedUid } = useStore(useShallow((s) => ({ events: s.events, traces: s.traces, selectedUid: s.selectedUid })));
  const ev = events.find((e) => e.uid === selectedUid) ?? events.find((e) => traces[e.uid]) ?? events[0];
  return { ev, trace: ev ? traces[ev.uid] : undefined };
}
