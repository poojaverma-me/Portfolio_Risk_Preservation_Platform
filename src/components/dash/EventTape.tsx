"use client";
import { Loader2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { eventRisks, navOf } from "@/lib/risk";
import { FEED_BY_ID } from "@/lib/data/feeds";
import { worstThreat } from "@/lib/pipeline/calculus";
import { Logo, ThreatBadge, timeAgo } from "../ui/bits";

export function EventTape({ limit = 14 }: { limit?: number }) {
  const now = useNow(5000);
  const { events, pending, selectedUid, set, alerts, traces, holdings, hedges } = useStore(
    useShallow((s) => ({ events: s.events, pending: s.pending, selectedUid: s.selectedUid, set: s.set, alerts: s.alerts, traces: s.traces, holdings: s.holdings, hedges: s.hedges }))
  );
  const nav = navOf(holdings);
  const statusBy = Object.fromEntries(alerts.map((a) => [a.uid, a.status]));
  if (!events.length) return <div className="px-4 py-6 text-[12.5px] text-mute">The tape fills as your feeds emit events.</div>;
  return (
    <ul className="divide-y divide-line/70">
      {events.slice(0, limit).map((e) => {
        const feed = FEED_BY_ID[e.feedId];
        const risks = traces[e.uid] ? eventRisks(e, traces[e.uid], holdings, hedges, nav) : undefined;
        const t = risks?.length ? worstThreat(risks.map((r) => r.threat)) : "LOW";
        return (
          <li key={e.uid}>
            <button onClick={() => set({ selectedUid: e.uid, selectedTicker: null })} className={`block w-full px-4 py-2.5 text-left transition hover:bg-raise/60 ${selectedUid === e.uid ? "bg-raise" : ""}`}>
              <div className="flex items-center gap-2 text-[10.5px] text-mute">
                <Logo domain={feed.domain} label={feed.name} size={14} />
                <span className="truncate text-ink2">{feed.name}</span>
                <span className="ml-auto shrink-0">{timeAgo(e.firedAt, now)}</span>
              </div>
              <div className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink">{e.headline}</div>
              <div className="mt-1.5 flex items-center gap-2">
                {pending[e.uid] ? (
                  <span className="flex items-center gap-1 text-[10.5px] text-mute">
                    <Loader2 size={11} className="animate-spin" /> analysing
                  </span>
                ) : statusBy[e.uid] === "dismissed" ? (
                  <span className="text-[10.5px] text-mute">dismissed</span>
                ) : (
                  <ThreatBadge threat={t} size="xs" />
                )}
                {risks && risks.length > 0 && <span className="num text-[10.5px] text-mute">{risks.length} exposed</span>}
                {e.origin === "stress" && <span className="font-cond text-[9.5px] font-semibold uppercase tracking-wider text-jev">stress</span>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
