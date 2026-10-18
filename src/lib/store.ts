"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Alert, FiredEvent, Holding, Trace } from "./types";
import { defaultHoldings } from "./data/universe";
import { FEEDS, FREE_FEED_LIMIT, PROFILES } from "./data/feeds";

export type Tier = "free" | "enterprise";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "good" | "warn";
}

interface State {
  holdings: Holding[];
  tier: Tier;
  activeFeeds: string[];
  profileId: string | null;
  live: boolean;
  intervalSec: number;
  llmMode: "auto" | "curated";
  events: FiredEvent[]; // newest first
  traces: Record<string, Trace>;
  pending: Record<string, boolean>;
  alerts: Alert[]; // newest first
  hedges: Record<string, number>; // ticker → hedge ratio 0..1
  selectedUid: string | null;
  selectedTicker: string | null;
  phoneOpen: boolean;
  openAlertUid: string | null;
  toasts: Toast[];
  upgradeOpen: boolean;
  theme: "dark" | "light";
  set: (p: Partial<State>) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  setTier: (t: Tier) => void;
  toggleFeed: (id: string) => boolean;
  applyProfile: (id: string) => boolean;
  addHolding: (h: Holding) => void;
  updateHolding: (id: string, patch: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  reset: () => void;
}

const MAX_EVENTS = 30;

const initial = () => ({
  holdings: defaultHoldings(),
  tier: "enterprise" as Tier,
  activeFeeds: FEEDS.map((f) => f.id),
  profileId: "full",
  live: true,
  intervalSec: 45,
  llmMode: "auto" as const,
  events: [] as FiredEvent[],
  traces: {} as Record<string, Trace>,
  pending: {} as Record<string, boolean>,
  alerts: [] as Alert[],
  hedges: {} as Record<string, number>,
  selectedUid: null,
  selectedTicker: null,
  phoneOpen: true,
  openAlertUid: null,
  toasts: [] as Toast[],
  upgradeOpen: false,
  theme: (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark") as "dark" | "light",
});

let toastId = 0;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),
      set: (p) => set(p),
      toast: (text, tone = "info") => {
        const id = ++toastId;
        set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
      },
      setTier: (tier) => {
        if (tier === "free") {
          // Downgrade keeps the first three non-premium feeds that were active.
          const allowed = FEEDS.filter((f) => !f.premiumOnly).map((f) => f.id);
          const keep = get().activeFeeds.filter((id) => allowed.includes(id)).slice(0, FREE_FEED_LIMIT);
          const feeds = keep.length ? keep : PROFILES[0].feeds;
          set({ tier, activeFeeds: feeds, profileId: matchProfile(feeds) });
        } else set({ tier });
      },
      toggleFeed: (id) => {
        const { tier, activeFeeds } = get();
        const feed = FEEDS.find((f) => f.id === id);
        const on = activeFeeds.includes(id);
        if (!on && tier === "free" && (feed?.premiumOnly || activeFeeds.length >= FREE_FEED_LIMIT)) {
          set({ upgradeOpen: true });
          return false;
        }
        const next = on ? activeFeeds.filter((f) => f !== id) : [...activeFeeds, id];
        set({ activeFeeds: next, profileId: matchProfile(next) });
        return true;
      },
      applyProfile: (pid) => {
        const p = PROFILES.find((x) => x.id === pid);
        if (!p) return false;
        if (p.premium && get().tier === "free") {
          set({ upgradeOpen: true });
          return false;
        }
        set({ activeFeeds: p.id === "full" ? FEEDS.map((f) => f.id) : p.feeds, profileId: p.id });
        return true;
      },
      addHolding: (h) => set((s) => ({ holdings: [...s.holdings.filter((x) => x.id !== h.id), h] })),
      updateHolding: (id, patch) => set((s) => ({ holdings: s.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      removeHolding: (id) => set((s) => ({ holdings: s.holdings.filter((h) => h.id !== id) })),
      reset: () => set({ ...initial(), theme: get().theme, toasts: [] }),
    }),
    {
      name: "bastion-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        holdings: s.holdings,
        tier: s.tier,
        activeFeeds: s.activeFeeds,
        profileId: s.profileId,
        live: s.live,
        intervalSec: s.intervalSec,
        llmMode: s.llmMode,
        events: s.events.slice(0, MAX_EVENTS),
        traces: s.traces,
        alerts: s.alerts,
        hedges: s.hedges,
        phoneOpen: s.phoneOpen,
        theme: s.theme,
      }),
    }
  )
);

function matchProfile(feeds: string[]) {
  if (feeds.length === FEEDS.length) return "full";
  const key = [...feeds].sort().join(",");
  return PROFILES.find((p) => p.id !== "full" && [...p.feeds].sort().join(",") === key)?.id ?? null;
}

export { MAX_EVENTS };
