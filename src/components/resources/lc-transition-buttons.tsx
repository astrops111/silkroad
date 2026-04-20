"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionLcStatus } from "@/lib/actions/resources-lc";

// Only forward-reachable states are valid targets for transitionLcStatus.
type TransitionTarget =
  | "applied"
  | "issued"
  | "advised"
  | "confirmed"
  | "docs_presented"
  | "discrepancies"
  | "accepted"
  | "settled"
  | "expired"
  | "cancelled";

interface Transition {
  to: TransitionTarget;
  label: string;
  tone?: "primary" | "danger" | "neutral";
}

interface Props {
  lcId: string;
  transitions: Transition[];
}

export function LcTransitionButtons({ lcId, transitions }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<TransitionTarget | null>(null);

  function go(to: TransitionTarget) {
    setError(null);
    setTarget(to);
    start(async () => {
      const result = await transitionLcStatus(lcId, to);
      setTarget(null);
      if (!result.success) {
        setError(result.error ?? "Failed to transition LC");
        return;
      }
      router.refresh();
    });
  }

  if (transitions.length === 0) return null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {transitions.map((tr) => {
          const busy = pending && target === tr.to;
          const base =
            "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-50";
          const cls =
            tr.tone === "danger"
              ? `${base} border border-red-500/30 text-red-200 hover:bg-red-500/10`
              : tr.tone === "primary"
                ? `${base} bg-[var(--amber)] text-black hover:opacity-90`
                : `${base} border border-white/20 hover:bg-white/5`;
          return (
            <button
              key={tr.to}
              type="button"
              disabled={pending}
              onClick={() => go(tr.to)}
              className={cls}
            >
              {busy ? "…" : tr.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
