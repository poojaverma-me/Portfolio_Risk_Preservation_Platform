"use client";
import { Crown, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { FEEDS, FREE_FEED_LIMIT } from "@/lib/data/feeds";
import { Btn } from "../ui/bits";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 left-20 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="slide-in pointer-events-auto max-w-sm rounded-lg border border-line2 bg-raise px-3.5 py-2.5 text-[12.5px] shadow-2xl" style={{ borderLeft: `3px solid ${t.tone === "good" ? "var(--color-good)" : t.tone === "warn" ? "var(--color-serious)" : "var(--color-accent)"}` }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function UpgradeModal() {
  const { upgradeOpen, set, setTier, toast } = useStore();
  if (!upgradeOpen) return null;
  const premium = FEEDS.length;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => set({ upgradeOpen: false })}>
      <div className="panel w-full max-w-[560px] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-2 font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-warn">
            <Crown size={15} /> Free plan limit reached
          </div>
          <button onClick={() => set({ upgradeOpen: false })} className="text-mute hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line">
          {[
            { name: "Free", price: "$0", items: [`${FREE_FEED_LIMIT} active feeds`, "Standard sources only", "Push alerts", "Full reasoning trace"] },
            { name: "Enterprise", price: "Contact sales", items: [`All ${premium} sources incl. MOFCOM, Nikkei, CMS, retail flow`, "Multi-source corroboration", "Unlimited stress tests", "SSO, audit log export, API access"] },
          ].map((p) => (
            <div key={p.name} className="bg-panel p-5">
              <div className="label">{p.name}</div>
              <div className="mt-1 text-[20px] font-semibold">{p.price}</div>
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink2">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-good" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Btn tone="ghost" onClick={() => set({ upgradeOpen: false })}>
            Stay on Free
          </Btn>
          <Btn
            tone="primary"
            onClick={() => {
              setTier("enterprise");
              set({ upgradeOpen: false });
              toast("Enterprise surveillance unlocked (simulated upgrade)", "good");
            }}
          >
            <Crown size={13} /> Simulate Enterprise upgrade
          </Btn>
        </div>
      </div>
    </div>
  );
}
