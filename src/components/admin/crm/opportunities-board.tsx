"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Building2, ExternalLink } from "lucide-react";

const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "rfq_submitted", label: "RFQ Submitted" },
  { key: "quoted", label: "Quoted" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  amount_minor: number | null;
  currency: string | null;
  deal_thread_id: string | null;
  updated_at: string;
  companies: { id: string; name: string; country_code: string | null } | null;
  crm_contacts: { id: string; full_name: string | null; email: string | null } | null;
  user_profiles: { id: string; full_name: string | null } | null;
}

function formatAmount(minor: number | null, currency: string | null): string {
  if (minor == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function OpportunitiesBoard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/opportunities");
      const data = await res.json();
      setOpportunities(data.opportunities ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveStage(id: string, stage: string) {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, stage } : o)));
    await fetch("/api/admin/crm/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    });
    void load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => void load()}
          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-6 gap-3 min-h-[60vh]">
        {STAGES.map((stage) => {
          const items = opportunities.filter((o) => o.stage === stage.key);
          const total = items.reduce((s, o) => s + (o.amount_minor ?? 0), 0);
          return (
            <div
              key={stage.key}
              className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex flex-col"
            >
              <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {stage.label}
                  <span className="ml-1.5 text-[var(--text-tertiary)] font-normal">
                    {items.length}
                  </span>
                </p>
                {total > 0 && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    {formatAmount(total, items[0]?.currency ?? "USD")}
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] p-2.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                        {o.name}
                      </p>
                      {o.deal_thread_id && (
                        <Link
                          href={`/admin/deals/${o.deal_thread_id}`}
                          className="text-[var(--text-tertiary)] hover:text-[var(--amber)] shrink-0"
                          title="Open deal"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {o.companies && (
                      <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {o.companies.name}
                      </p>
                    )}
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                      {formatAmount(o.amount_minor, o.currency)}
                    </p>
                    <select
                      value={o.stage}
                      onChange={(e) => void moveStage(o.id, e.target.value)}
                      className="w-full text-[11px] rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-1.5 py-1 text-[var(--text-secondary)] focus:outline-none"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-[11px] text-[var(--text-tertiary)] text-center py-4">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
