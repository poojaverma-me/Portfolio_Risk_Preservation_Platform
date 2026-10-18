"use client";
import type { Alert, FiredEvent, NewsEvent, Trace } from "./types";
import { useStore, MAX_EVENTS } from "./store";
import { eventRisks, navOf } from "./risk";
import { screen } from "./pipeline/screen";
import { worstThreat } from "./pipeline/calculus";
import { FEED_BY_ID } from "./data/feeds";

// Client orchestration: fire an event → POST /api/analyze → store trace → dispatch
// a push alert to the simulated phone. Also re-scores open events when the book changes.

let seq = 0;

export async function fireEvent(event: NewsEvent, origin: FiredEvent["origin"]) {
  const s = useStore.getState();
  const firedAt = Date.now();
  const fired: FiredEvent = { ...event, uid: `${event.id}-${firedAt.toString(36)}-${++seq}`, firedAt, origin };
  s.set({
    events: [fired, ...s.events].slice(0, MAX_EVENTS),
    pending: { ...s.pending, [fired.uid]: true },
    selectedUid: fired.uid,
  });
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: fired.uid, receivedAt: firedAt, event, holdings: useStore.getState().holdings, llmMode: s.llmMode }),
    });
    if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
    const trace = (await res.json()) as Trace;
    const st = useStore.getState();
    const pending = { ...st.pending };
    delete pending[fired.uid];
    st.set({ traces: pruneTraces({ ...st.traces, [fired.uid]: trace }, st.events), pending });
    dispatchAlert(fired, trace);
  } catch (err) {
    const st = useStore.getState();
    const pending = { ...st.pending };
    delete pending[fired.uid];
    st.set({ pending });
    st.toast(`Pipeline error: ${(err as Error).message}`, "warn");
  }
  return fired.uid;
}

function pruneTraces(traces: Record<string, Trace>, events: FiredEvent[]) {
  const keep = new Set(events.map((e) => e.uid));
  return Object.fromEntries(Object.entries(traces).filter(([k]) => keep.has(k)));
}

function dispatchAlert(ev: FiredEvent, trace: Trace) {
  const s = useStore.getState();
  const risks = eventRisks(ev, trace, s.holdings, s.hedges, navOf(s.holdings)).filter((r) => r.threat !== "LOW");
  if (!risks.length) return;
  // Simulated APNs/FCM hop: 250–900 ms after the pipeline completes.
  const hop = 250 + Math.round(Math.random() * 650);
  setTimeout(() => {
    const alert: Alert = {
      uid: ev.uid,
      createdAt: Date.now(),
      deliveredMs: trace.completedAt - ev.firedAt + hop,
      threat: worstThreat(risks.map((r) => r.threat)),
      title: ev.label,
      summary: trace.llm.extraction.summary,
      tickers: risks.slice(0, 4).map((r) => ({ ticker: r.ticker, direction: r.direction, probability: r.probability, range: r.range })),
      status: "new",
      origin: ev.origin,
    };
    const st = useStore.getState();
    st.set({ alerts: [alert, ...st.alerts.filter((a) => a.uid !== ev.uid)].slice(0, MAX_EVENTS) });
  }, hop);
}

let rescoring = false;

/** Holdings changed: re-run Jev for open events whose screen now includes unseen tickers. */
export async function rescoreOpenEvents() {
  if (rescoring) return;
  rescoring = true;
  try {
    await rescoreOnce();
  } finally {
    rescoring = false;
  }
}

async function rescoreOnce() {
  const s = useStore.getState();
  const dismissed = new Set(s.alerts.filter((a) => a.status === "dismissed").map((a) => a.uid));
  const open = s.events.filter((e) => s.traces[e.uid] && !dismissed.has(e.uid)).slice(0, 8);
  for (const ev of open) {
    const tr = s.traces[ev.uid];
    const { hits } = screen(s.holdings, tr.llm.extraction.vectors);
    const missing = hits.filter((h) => !tr.jev.holdings[h.ticker]);
    if (!missing.length) continue;
    const res = await fetch("/api/rescore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: ev, extraction: tr.llm.extraction, holdings: s.holdings }),
    });
    if (!res.ok) continue;
    const r = await res.json();
    const st = useStore.getState();
    const cur = st.traces[ev.uid];
    if (!cur) continue;
    st.set({ traces: { ...st.traces, [ev.uid]: { ...cur, ...r } } });
    st.toast(`Re-scored "${ev.label}" with Jev for ${missing.map((m) => m.ticker).join(", ")}`, "info");
  }
}

/** Pick the next stream event from active feeds, avoiding recent repeats. */
export function nextStreamEvent(pool: NewsEvent[], activeFeeds: string[], recent: string[]) {
  const live = pool.filter((e) => activeFeeds.includes(e.feedId) && FEED_BY_ID[e.feedId]);
  if (!live.length) return null;
  const fresh = live.filter((e) => !recent.includes(e.id));
  const from = fresh.length ? fresh : live;
  return from[Math.floor(Math.random() * from.length)];
}
