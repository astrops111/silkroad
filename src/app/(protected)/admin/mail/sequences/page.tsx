"use client";

import { useCallback, useEffect, useState } from "react";
import { Repeat, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  id: string;
  step_order: number;
  delay_hours: number;
  subject_template: string | null;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  is_active: boolean;
  email_sequence_steps: Step[];
  enrollmentStats: { active: number; completed: number; stopped: number };
}

const TRIGGER_LABELS: Record<string, string> = {
  rfq_no_quote: "RFQ with no quote",
  quote_expiring: "Quote expiring soon",
  order_payment_pending: "Order payment pending",
  post_delivery_review: "Post-delivery review",
  user_registered: "User registered",
  custom: "Custom",
};

export default function EmailSequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mail/sequences");
      const data = await res.json();
      setSequences(data.sequences ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(sequence: Sequence) {
    await fetch("/api/admin/mail/sequences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sequence.id, isActive: !sequence.is_active }),
    });
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Email Sequences
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Automated follow-up chains — enrollment and sending run on the email-sequences
            cron (currently manual trigger while scheduled crons are paused)
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {sequences.map((s) => (
        <div
          key={s.id}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          <div className="flex items-center gap-3">
            <Repeat className="w-5 h-5 text-[var(--amber)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Trigger: {TRIGGER_LABELS[s.trigger_event] ?? s.trigger_event} ·{" "}
                {s.enrollmentStats.active} active · {s.enrollmentStats.completed} completed ·{" "}
                {s.enrollmentStats.stopped} stopped
              </p>
            </div>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                s.is_active
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]"
              }`}
            >
              {s.is_active ? "Active" : "Off"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => void toggle(s)}>
              {s.is_active ? "Disable" : "Enable"}
            </Button>
          </div>
          {s.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-2">{s.description}</p>
          )}
          <div className="mt-2 space-y-1">
            {[...s.email_sequence_steps]
              .sort((a, b) => a.step_order - b.step_order)
              .map((step) => (
                <p key={step.id} className="text-xs text-[var(--text-tertiary)]">
                  Step {step.step_order} · +{step.delay_hours}h ·{" "}
                  {step.subject_template ?? "(managed template)"}
                </p>
              ))}
          </div>
        </div>
      ))}

      {!loading && sequences.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-10">No sequences</p>
      )}
    </div>
  );
}
