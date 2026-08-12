"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Ship, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/payments/currency-config";
import { TRADE_FLOW_STEPS, STEP_DEFS, stepIndex } from "@/lib/trade-flow/steps";

interface FlowRow {
  id: string;
  flow_number: string;
  current_step: string;
  supplier_name: string | null;
  destination_port: string | null;
  currency: string;
  grand_total: number | null;
  vessel_name: string | null;
  eta: string | null;
  created_at: string;
  updated_at: string;
}

function progressPct(step: string): number {
  if (step === "completed") return 100;
  if (step === "cancelled") return 0;
  const idx = stepIndex(step);
  if (idx < 0) return 0;
  return Math.round((idx / (TRADE_FLOW_STEPS.length - 1)) * 100);
}

export default function BuyerTradeFlowsPage() {
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trade-flows");
        const data = await res.json();
        setFlows(data.flows ?? []);
      } catch (err) {
        console.error("Failed to fetch trade flows:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Order Tracking
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Follow each order from quote to document release — every milestone is updated here and emailed to you.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-primary)" }}>
          <Ship className="w-10 h-10" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No orders being tracked yet</p>
          <p className="text-xs max-w-sm text-center" style={{ color: "var(--text-tertiary)" }}>
            Tracking starts automatically when you submit an RFQ or place an order.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map((f) => {
            const pct = progressPct(f.current_step);
            const cancelled = f.current_step === "cancelled";
            const completed = f.current_step === "completed";
            return (
              <Link
                key={f.id}
                href={`/dashboard/trade-flows/${f.id}`}
                className="block rounded-2xl border p-5 hover:shadow-sm transition-shadow"
                style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{f.flow_number}</span>
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={
                          cancelled
                            ? { color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }
                            : completed
                              ? { color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }
                              : { color: "var(--indigo)", background: "color-mix(in srgb, var(--indigo) 10%, transparent)" }
                        }
                      >
                        {STEP_DEFS[f.current_step]?.label ?? f.current_step}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {f.destination_port ? `To ${f.destination_port}` : "Destination pending"}
                      {f.vessel_name ? ` · ${f.vessel_name}` : ""}
                      {f.eta ? ` · ETA ${f.eta}` : ""}
                      {f.grand_total !== null ? ` · ${formatMoney(f.grand_total, f.currency)}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                </div>
                {!cancelled && (
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-secondary)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: completed ? "var(--success)" : "var(--amber)" }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
