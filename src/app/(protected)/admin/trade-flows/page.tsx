"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Workflow, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/payments/currency-config";
import { TRADE_FLOW_STEPS, STEP_DEFS, stepIndex } from "@/lib/trade-flow/steps";

interface FlowRow {
  id: string;
  flow_number: string;
  rfq_id: string | null;
  purchase_order_id: string | null;
  current_step: string;
  buyer_company_name: string | null;
  supplier_name: string | null;
  destination_port: string | null;
  currency: string;
  grand_total: number | null;
  created_at: string;
  updated_at: string;
}

function stepBadge(step: string) {
  const def = STEP_DEFS[step];
  const idx = stepIndex(step);
  const total = TRADE_FLOW_STEPS.length;
  if (step === "cancelled")
    return { label: "Cancelled", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)" };
  if (step === "completed")
    return { label: "Completed", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)" };
  return {
    label: `${idx + 1}/${total} · ${def?.label ?? step}`,
    color: "var(--indigo)",
    bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",
  };
}

export default function TradeFlowsPage() {
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stepFilter, setStepFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (stepFilter) params.set("step", stepFilter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/trade-flows?${params}`);
      const data = await res.json();
      setFlows(data.flows ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch trade flows:", err);
    } finally {
      setLoading(false);
    }
  }, [stepFilter, search]);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Trade Flows
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            The admin-mediated buy process — RFQ → supplier invoice → payment → shipment → clearance → document release. {total} flow{total === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flow #, buyer, supplier…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>
        <select
          value={stepFilter}
          onChange={(e) => setStepFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
        >
          <option value="">All steps</option>
          {TRADE_FLOW_STEPS.map((s, i) => (
            <option key={s} value={s}>{i + 1}. {STEP_DEFS[s]?.label ?? s}</option>
          ))}
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-primary)" }}>
          <Workflow className="w-10 h-10" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No trade flows yet</p>
          <p className="text-xs max-w-sm text-center" style={{ color: "var(--text-tertiary)" }}>
            Flows open automatically when a buyer publishes an RFQ or places an order. You can also open one from an RFQ or order detail page.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  <th className="px-5 py-3 font-semibold">Flow</th>
                  <th className="px-5 py-3 font-semibold">Buyer</th>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                  <th className="px-5 py-3 font-semibold">Step</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Destination</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                {flows.map((f) => {
                  const badge = stepBadge(f.current_step);
                  return (
                    <tr key={f.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/trade-flows/${f.id}`} className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {f.flow_number}
                        </Link>
                        <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {f.rfq_id ? "from RFQ" : f.purchase_order_id ? "from order" : "manual"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{f.buyer_company_name ?? "—"}</td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{f.supplier_name ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ color: badge.color, background: badge.bg }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium" style={{ color: "var(--text-primary)" }}>
                        {f.grand_total !== null ? formatMoney(f.grand_total, f.currency) : "—"}
                      </td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{f.destination_port ?? "—"}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(f.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/trade-flows/${f.id}`}>
                          <ChevronRight className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
