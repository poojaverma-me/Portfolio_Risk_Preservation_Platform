"use client";
import { Lock, Crown, Radio, Check } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { FEEDS, FREE_FEED_LIMIT, KIND_LABEL, PROFILES } from "@/lib/data/feeds";
import { EVENTS } from "@/lib/data/events";
import type { Feed } from "@/lib/types";
import { Logo, PanelHead } from "@/components/ui/bits";

const KINDS: Feed["kind"][] = ["social", "wire", "regulator", "government", "market"];

export default function Feeds() {
  const { tier, activeFeeds, profileId, toggleFeed, applyProfile, setTier, toast } = useStore(
    useShallow((s) => ({ tier: s.tier, activeFeeds: s.activeFeeds, profileId: s.profileId, toggleFeed: s.toggleFeed, applyProfile: s.applyProfile, setTier: s.setTier, toast: s.toast }))
  );
  const free = tier === "free";
  const presetsBy = EVENTS.reduce<Record<string, number>>((m, e) => ((m[e.feedId] = (m[e.feedId] ?? 0) + 1), m), {});

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel overflow-hidden">
          <PanelHead title="Monitoring profiles" sub="one click switches the active source set" icon={<Radio size={14} />} />
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {PROFILES.map((p) => {
              const locked = p.premium && free;
              const on = profileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyProfile(p.id) && toast(`Profile: ${p.name}`, "info")}
                  className={`rounded-lg border p-3 text-left transition ${on ? "border-accent/60 bg-accent/[0.07]" : "border-line bg-panel2 hover:border-line2"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{p.name}</span>
                    {locked && <Lock size={12} className="text-warn" />}
                    {on && <Check size={14} className="ml-auto text-accent" />}
                  </div>
                  <div className="mt-1 text-[11.5px] text-ink2">{p.description}</div>
                  <div className="num mt-1.5 text-[10.5px] text-mute">{p.id === "full" ? FEEDS.length : p.feeds.length} sources</div>
                </button>
              );
            })}
          </div>
        </section>
        <section className="panel p-4">
          <div className="label">Subscription simulator</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["free", "enterprise"] as const).map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`rounded-lg border p-3 text-left ${tier === t ? "border-accent/60 bg-accent/[0.07]" : "border-line bg-panel2"}`}>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold capitalize">
                  {t === "enterprise" && <Crown size={13} className="text-warn" />}
                  {t}
                </div>
                <div className="mt-1 text-[11.5px] text-ink2">{t === "free" ? `Up to ${FREE_FEED_LIMIT} standard feeds` : `All ${FEEDS.length} feeds, multi-source surveillance`}</div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[11.5px]">
              <span className="text-ink2">Active feeds</span>
              <span className="num">
                {activeFeeds.length} / {free ? FREE_FEED_LIMIT : FEEDS.length}
              </span>
            </div>
            <div className="mt-1.5 flex gap-[2px]">
              {Array.from({ length: free ? FREE_FEED_LIMIT : FEEDS.length }).map((_, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-sm" style={{ background: i < activeFeeds.length ? "var(--color-accent)" : "var(--color-line)" }} />
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-snug text-mute">The live stream only emits events from active feeds. Stress Lab presets can be fired from any source.</p>
          </div>
        </section>
      </div>

      {KINDS.map((k) => (
        <section key={k} className="panel overflow-hidden">
          <PanelHead title={KIND_LABEL[k]} sub={`${FEEDS.filter((f) => f.kind === k).length} sources`} />
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
            {FEEDS.filter((f) => f.kind === k).map((f) => {
              const on = activeFeeds.includes(f.id);
              const locked = free && (f.premiumOnly || (!on && activeFeeds.length >= FREE_FEED_LIMIT));
              return (
                <button key={f.id} onClick={() => toggleFeed(f.id)} className={`relative rounded-lg border p-3 text-left transition ${on ? "border-accent/40 bg-accent/[0.05]" : "border-line bg-panel2 hover:border-line2"}`}>
                  <div className="flex items-center gap-2.5">
                    <Logo domain={f.domain} label={f.name} size={22} />
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[13px] font-semibold text-ink">{f.name}</div>
                      <div className="truncate text-[11px] text-mute">{f.handle}</div>
                    </div>
                    <span className={`ml-auto grid h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${on ? "bg-accent" : "bg-line2"}`}>
                      <span className={`h-4 w-4 rounded-full transition ${on ? "translate-x-4 bg-navy" : "bg-ink"}`} />
                    </span>
                  </div>
                  <div className="mt-2 text-[11.5px] text-ink2">{f.coverage}</div>
                  <div className="num mt-2 flex gap-3 text-[10.5px] text-mute">
                    <span>reliability {f.reliability.toFixed(2)}</span>
                    <span>~{f.latencySec}s ingest</span>
                    <span>{presetsBy[f.id] ?? 0} sim events</span>
                  </div>
                  {locked && (
                    <span className="absolute right-2 top-9 flex items-center gap-1 rounded bg-warn/15 px-1.5 py-0.5 font-cond text-[9.5px] font-semibold uppercase tracking-wider text-warn">
                      <Lock size={10} /> {f.premiumOnly ? "Enterprise" : "Limit"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
