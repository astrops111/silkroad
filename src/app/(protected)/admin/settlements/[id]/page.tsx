"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Landmark, CheckCircle2, XCircle, Clock,
  Smartphone, CreditCard, Building, Loader2, Download, TrendingUp,
  AlertCircle, Ban,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types — matches GET /api/admin/settlements                         */
/* ------------------------------------------------------------------ */
interface SettlementDetail {
  id: string;
  settlement_number: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  total_commission: number;
  total_tax_on_commission: number | null;
  logistics_charges: number | null;
  net_payout: number;
  currency: string;
  status: string | null;
  payout_method: string | null;
  payout_reference: string | null;
  mobile_money_phone: string | null;
  mobile_money_provider: string | null;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  created_at: string;
  supplier_id: string;
  companies: { name: string; country_code: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Config — mirrors settlement_status enum                            */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending:    { label: "Pending",    color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  calculating:{ label: "Calculating",color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: Clock },
  ready:      { label: "Ready",      color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: CheckCircle2 },
  processing: { label: "Processing",color: "var(--amber-dark)",bg: "color-mix(in srgb, var(--amber) 12%, transparent)", icon: AlertCircle },
  paid:       { label: "Paid",       color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)",icon: CheckCircle2 },
  failed:     { label: "Failed",     color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  disputed:   { label: "Disputed",   color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: AlertCircle },
  cancelled:  { label: "Cancelled",  color: "var(--text-tertiary)", bg: "var(--surface-secondary)",                     icon: Ban },
};

function statusMeta(status: string | null) {
  return status ? STATUS_CONFIG[status] ?? { label: status, color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock } : { label: "Unknown", color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock };
}

function payoutMethodMeta(method: string | null) {
  if (!method) return { label: "Not set", icon: Building };
  const m = method.toLowerCase();
  if (m.includes("momo") || m.includes("mobile") || m.includes("mpesa") || m.includes("airtel")) return { label: method, icon: Smartphone };
  if (m.includes("stripe") || m.includes("card")) return { label: method, icon: CreditCard };
  return { label: method, icon: Building };
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 0 }).format((cents || 0) / 100);
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSettlement = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/admin/settlements has no single-record lookup — it only
      // supports status/limit/offset. We pull a large page and find the row
      // by id client-side rather than inventing a new [id] endpoint.
      const res = await fetch(`/api/admin/settlements?limit=500`);
      const data = await res.json();
      const found = (data.settlements as SettlementDetail[] | undefined)?.find((s) => s.id === id) ?? null;
      setSettlement(found);
      setNotFound(!found);
    } catch (err) {
      console.error("Failed to fetch settlement:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSettlement(); }, [fetchSettlement]);

  async function handleAction(action: "process" | "mark_paid" | "fail") {
    if (!settlement) return;
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: settlement.id, action }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(action === "process" ? "Payout initiated" : action === "mark_paid" ? "Marked as paid" : "Marked as failed");
        await fetchSettlement();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
      </div>
    );
  }

  if (notFound || !settlement) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Landmark className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Settlement not found</p>
        <Link href="/admin/settlements" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to settlements</Link>
      </div>
    );
  }

  const status = statusMeta(settlement.status);
  const StatusIcon = status.icon;
  const payout = payoutMethodMeta(settlement.payout_method);
  const PayoutIcon = payout.icon;
  const canProcess = settlement.status === "pending" || settlement.status === "ready" || settlement.status === "calculating";
  const canMarkPaid = settlement.status === "processing";
  const canRetry = settlement.status === "failed";
  const isTerminal = settlement.status === "paid" || settlement.status === "cancelled" || settlement.status === "disputed";

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/settlements" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Settlements
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {settlement.companies?.name || "Unknown Supplier"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {settlement.settlement_number} · {new Date(settlement.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(settlement.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button disabled title="Not implemented — no PDF/report export endpoint exists for settlements" className="btn-outline !py-2 !px-4 !text-sm shrink-0 opacity-50 cursor-not-allowed">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <TrendingUp className="w-4 h-4" style={{ color: "var(--amber)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Financial Breakdown</h2>
        </div>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--border-subtle)" }}>
          {[
            { label: "Gross Sales",  value: money(settlement.gross_sales, settlement.currency),  note: "Total supplier order value", accent: "var(--text-primary)" },
            { label: "Platform Fee", value: `-${money(settlement.total_commission, settlement.currency)}`, note: "Commission + tax withheld", accent: "var(--danger)" },
            { label: "Net Payout",   value: money(settlement.net_payout, settlement.currency),   note: "Amount due to supplier",     accent: "var(--success)" },
          ].map((item) => (
            <div key={item.label} className="px-6 py-5" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: item.accent }}>{item.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: itemized charges */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <Landmark className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Charge Breakdown</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {[
                { label: "Gross Sales", value: settlement.gross_sales },
                { label: "Commission", value: settlement.total_commission },
                { label: "Tax on Commission", value: settlement.total_tax_on_commission ?? 0 },
                { label: "Logistics Charges", value: settlement.logistics_charges ?? 0 },
                { label: "Net Payout", value: settlement.net_payout, bold: true },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
                  <span className={row.bold ? "text-sm font-semibold" : "text-sm"} style={{ color: row.bold ? "var(--text-primary)" : "var(--text-secondary)" }}>{row.label}</span>
                  <span className={row.bold ? "text-sm font-bold" : "text-sm font-medium"} style={{ color: "var(--text-primary)" }}>{money(row.value, settlement.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contributing orders not available */}
          <div className="rounded-2xl border p-6 mt-5 flex items-start gap-3" style={{ background: "var(--surface-secondary)", borderColor: "var(--border-subtle)" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              This settlement&apos;s contributing orders (<code>supplier_order_ids</code>) are stored on the record but not returned by <code>GET /api/admin/settlements</code>, so an itemized order list can&apos;t be shown here without a dedicated endpoint.
            </p>
          </div>
        </div>

        {/* Right: payout + actions */}
        <div className="space-y-5">
          <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <PayoutIcon className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Payout Details</h2>
            </div>
            {[
              { label: "Method",    value: payout.label },
              { label: "Amount",    value: money(settlement.net_payout, settlement.currency) },
              { label: "Reference", value: settlement.payout_reference ?? "—" },
              { label: "Mobile Money", value: settlement.mobile_money_phone ? `${settlement.mobile_money_provider ?? ""} ${settlement.mobile_money_phone}`.trim() : "—" },
              { label: "Stripe Transfer", value: settlement.stripe_transfer_id ?? "—" },
              { label: "Paid At", value: settlement.paid_at ? new Date(settlement.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Pending" },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{row.label}</p>
                <p className="text-sm font-medium break-all" style={{ color: "var(--text-primary)" }}>{row.value}</p>
              </div>
            ))}
          </div>

          {!isTerminal && (
            <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>
              {canProcess && (
                <button onClick={() => handleAction("process")} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--success)", color: "white" }}>
                  {actionLoading === "process" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Process Payout
                </button>
              )}
              {canMarkPaid && (
                <>
                  <button onClick={() => handleAction("mark_paid")} disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--success)", color: "white" }}>
                    {actionLoading === "mark_paid" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark as Paid
                  </button>
                  <button onClick={() => handleAction("fail")} disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                    style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                    {actionLoading === "fail" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Mark as Failed
                  </button>
                </>
              )}
              {canRetry && (
                <button onClick={() => handleAction("process")} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
                  {actionLoading === "process" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Retry Payout
                </button>
              )}
            </div>
          )}

          {settlement.status === "paid" && (
            <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--success) 8%, transparent)", borderColor: "color-mix(in srgb, var(--success) 20%, transparent)" }}>
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>Payout completed</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {settlement.paid_at ? new Date(settlement.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
