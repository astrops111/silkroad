"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, CreditCard, CheckCircle2, Clock, XCircle, AlertTriangle,
  RotateCcw, Smartphone, Building, Copy, RefreshCw, Loader2,
  ExternalLink, Activity,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type PaymentStatus = "completed" | "pending" | "failed" | "refunded" | "disputed";
type Gateway = "stripe" | "flutterwave" | "mtn_momo" | "airtel_money" | "mpesa" | "bank_transfer" | "xtransfer";

interface TimelineEvent { date: string; event: string; }
interface PaymentDetail {
  id: string; orderId: string; buyerName: string; buyerCountry: string; buyerEmail: string;
  amount: number; gateway: Gateway; status: PaymentStatus;
  createdAt: string; settledAt: string | null; reference: string;
  failureReason: string | null; timeline: TimelineEvent[];
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */
const PAYMENTS: PaymentDetail[] = [
  { id: "PAY-20260415-001", orderId: "SR-20260415-001", buyerName: "Nairobi Imports Ltd", buyerCountry: "🇰🇪", buyerEmail: "ops@nairobiimports.co.ke", amount: 12400, gateway: "mpesa", status: "completed", createdAt: "2026-04-15 14:32", settledAt: "2026-04-15 14:35", reference: "MPE-7X4K2L", failureReason: null, timeline: [{ date: "2026-04-15 14:32", event: "Payment initiated via M-Pesa" }, { date: "2026-04-15 14:33", event: "STK push sent to buyer" }, { date: "2026-04-15 14:35", event: "Payment confirmed by Safaricom" }, { date: "2026-04-15 14:35", event: "Settlement queued" }] },
  { id: "PAY-20260414-003", orderId: "SR-20260414-002", buyerName: "TechHub Ghana", buyerCountry: "🇬🇭", buyerEmail: "finance@techhubgh.com", amount: 8750, gateway: "mtn_momo", status: "completed", createdAt: "2026-04-14 09:18", settledAt: "2026-04-14 09:21", reference: "MTN-93KJ1P", failureReason: null, timeline: [{ date: "2026-04-14 09:18", event: "Payment initiated via MTN MoMo" }, { date: "2026-04-14 09:19", event: "Approval request sent to buyer" }, { date: "2026-04-14 09:21", event: "Payment approved and captured" }] },
  { id: "PAY-20260413-007", orderId: "SR-20260413-005", buyerName: "Cairo Electronics", buyerCountry: "🇪🇬", buyerEmail: "payments@cairoelec.eg", amount: 31200, gateway: "stripe", status: "completed", createdAt: "2026-04-13 16:45", settledAt: "2026-04-14 08:00", reference: "pi_3QxK9s", failureReason: null, timeline: [{ date: "2026-04-13 16:45", event: "Stripe PaymentIntent created" }, { date: "2026-04-13 16:46", event: "Card authorized" }, { date: "2026-04-13 16:46", event: "Capture succeeded" }, { date: "2026-04-14 08:00", event: "Funds settled to platform account" }] },
  { id: "PAY-20260412-009", orderId: "SR-20260412-008", buyerName: "Lagos Distribution Co", buyerCountry: "🇳🇬", buyerEmail: "accounts@lagodistco.ng", amount: 5600, gateway: "flutterwave", status: "failed", createdAt: "2026-04-12 11:10", settledAt: null, reference: "FW-ERR-4921", failureReason: "Insufficient funds — card declined by issuing bank (code: DO NOT HONOUR)", timeline: [{ date: "2026-04-12 11:10", event: "Payment initiated via Flutterwave" }, { date: "2026-04-12 11:11", event: "Card charge attempted" }, { date: "2026-04-12 11:11", event: "Card declined — insufficient funds" }, { date: "2026-04-12 11:12", event: "Failure notification sent to buyer" }] },
  { id: "PAY-20260411-002", orderId: "SR-20260411-003", buyerName: "Kigali Fresh Markets", buyerCountry: "🇷🇼", buyerEmail: "kigalifresh@gmail.com", amount: 4200, gateway: "mtn_momo", status: "pending", createdAt: "2026-04-11 08:55", settledAt: null, reference: "MTN-PND-0038", failureReason: null, timeline: [{ date: "2026-04-11 08:55", event: "Payment initiated via MTN MoMo" }, { date: "2026-04-11 08:56", event: "Approval request sent to buyer" }, { date: "2026-04-11 09:10", event: "No response after 14 minutes — awaiting buyer action" }] },
  { id: "PAY-20260410-011", orderId: "SR-20260408-003", buyerName: "TechHub Ghana", buyerCountry: "🇬🇭", buyerEmail: "finance@techhubgh.com", amount: 2400, gateway: "stripe", status: "refunded", createdAt: "2026-04-10 13:22", settledAt: "2026-04-10 13:25", reference: "pi_3QwA1r_refund", failureReason: null, timeline: [{ date: "2026-04-10 13:22", event: "Original payment completed" }, { date: "2026-04-10 13:25", event: "Refund requested by admin" }, { date: "2026-04-10 13:25", event: "Stripe refund issued (re_3QwA1r)" }, { date: "2026-04-10 13:26", event: "Buyer notified of refund" }] },
  { id: "PAY-20260409-005", orderId: "SR-20260405-012", buyerName: "Nairobi Imports Ltd", buyerCountry: "🇰🇪", buyerEmail: "ops@nairobiimports.co.ke", amount: 560, gateway: "mpesa", status: "disputed", createdAt: "2026-04-09 17:04", settledAt: null, reference: "MPE-DIS-1129", failureReason: null, timeline: [{ date: "2026-04-09 17:04", event: "Payment captured via M-Pesa" }, { date: "2026-04-10 09:15", event: "Buyer raised dispute — goods not received" }, { date: "2026-04-10 09:16", event: "Payment placed on hold" }, { date: "2026-04-10 09:20", event: "Dispute case opened: DIS-20260410-001" }] },
  { id: "PAY-20260408-014", orderId: "SR-20260407-006", buyerName: "Dar Trading House", buyerCountry: "🇹🇿", buyerEmail: "trade@dartradinghouse.tz", amount: 9800, gateway: "airtel_money", status: "completed", createdAt: "2026-04-08 10:30", settledAt: "2026-04-08 10:34", reference: "AIR-62MN9A", failureReason: null, timeline: [{ date: "2026-04-08 10:30", event: "Payment initiated via Airtel Money" }, { date: "2026-04-08 10:31", event: "Approval push sent to buyer" }, { date: "2026-04-08 10:34", event: "Payment approved" }] },
  { id: "PAY-20260406-018", orderId: "SR-20260405-010", buyerName: "Addis Trade Partners", buyerCountry: "🇪🇹", buyerEmail: "finance@addistraders.et", amount: 19200, gateway: "bank_transfer", status: "completed", createdAt: "2026-04-06 14:00", settledAt: "2026-04-07 09:00", reference: "WIRE-ET-00291", failureReason: null, timeline: [{ date: "2026-04-06 14:00", event: "Bank transfer instructions sent to buyer" }, { date: "2026-04-06 17:30", event: "Incoming wire detected" }, { date: "2026-04-07 09:00", event: "Funds confirmed and cleared" }] },
  { id: "PAY-20260404-022", orderId: "SR-20260403-014", buyerName: "Kampala Wholesale Group", buyerCountry: "🇺🇬", buyerEmail: "accounts@kampalaWG.ug", amount: 6700, gateway: "mtn_momo", status: "failed", createdAt: "2026-04-04 08:15", settledAt: null, reference: "MTN-FAIL-0074", failureReason: "Transaction timed out — buyer did not approve within 120 seconds", timeline: [{ date: "2026-04-04 08:15", event: "Payment initiated via MTN MoMo" }, { date: "2026-04-04 08:16", event: "Approval request sent to buyer" }, { date: "2026-04-04 08:18", event: "Request expired — no buyer response" }, { date: "2026-04-04 08:19", event: "Failure logged; buyer notified" }] },
];

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const statusConfig: Record<PaymentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending:   { label: "Pending",   color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  failed:    { label: "Failed",    color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger)  10%, transparent)", icon: XCircle },
  refunded:  { label: "Refunded",  color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo)  10%, transparent)", icon: RotateCcw },
  disputed:  { label: "Disputed",  color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: AlertTriangle },
};
const gatewayConfig: Record<Gateway, { label: string; icon: typeof CreditCard }> = {
  stripe:        { label: "Stripe",        icon: CreditCard },
  flutterwave:   { label: "Flutterwave",   icon: CreditCard },
  mtn_momo:      { label: "MTN MoMo",      icon: Smartphone },
  airtel_money:  { label: "Airtel Money",  icon: Smartphone },
  mpesa:         { label: "M-Pesa",        icon: Smartphone },
  bank_transfer: { label: "Bank Transfer", icon: Building },
  xtransfer:     { label: "XTransfer",     icon: Building },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const payment = PAYMENTS.find((p) => p.id === id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CreditCard className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Payment not found</p>
        <Link href="/admin/payments" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to payments</Link>
      </div>
    );
  }

  const status = statusConfig[payment.status];
  const StatusIcon = status.icon;
  const gw = gatewayConfig[payment.gateway];
  const GwIcon = gw.icon;

  async function handleAction(action: string) {
    setActionLoading(action);
    await new Promise((r) => setTimeout(r, 800));
    setActionLoading(null);
    const messages: Record<string, string> = { retry: "Payment retry initiated", refund: "Refund issued successfully" };
    toast.success(messages[action] ?? "Done");
  }

  function copyRef() {
    if (!payment) return;
    navigator.clipboard.writeText(payment.reference);
    toast.success("Reference copied");
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/payments" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Payments
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono" style={{ color: "var(--text-primary)" }}>
                {payment.id}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <button onClick={copyRef} className="mt-1 inline-flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity font-mono" style={{ color: "var(--text-tertiary)" }}>
              ref: {payment.reference} <Copy className="w-3 h-3" />
            </button>
          </div>
          <Link href={`/admin/orders/${payment.orderId}`} className="inline-flex items-center gap-1.5 btn-outline !py-2 !px-4 !text-sm shrink-0">
            <ExternalLink className="w-4 h-4" /> {payment.orderId}
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-3 gap-5">
        {[
          {
            label: "Amount",
            value: `$${payment.amount.toLocaleString()}`,
            accent: payment.status === "refunded" ? "var(--indigo)" : "var(--text-primary)",
            note: payment.status === "refunded" ? "Refunded" : payment.status === "failed" ? "Not captured" : "Captured",
          },
          { label: "Gateway", value: gw.label, accent: "var(--text-primary)", note: payment.gateway },
          {
            label: payment.settledAt ? "Settled" : "Created",
            value: payment.settledAt ?? payment.createdAt,
            accent: "var(--text-primary)",
            note: payment.settledAt ? `initiated ${payment.createdAt}` : "Not yet settled",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border p-5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: kpi.accent }}>{kpi.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: failure reason + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {payment.failureReason && (
            <div className="rounded-2xl border p-5" style={{ background: "color-mix(in srgb, var(--danger) 6%, transparent)", borderColor: "color-mix(in srgb, var(--danger) 20%, transparent)" }}>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 shrink-0" style={{ color: "var(--danger)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Failure Reason</p>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{payment.failureReason}</p>
            </div>
          )}

          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <Activity className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Transaction Timeline</h2>
            </div>
            <div className="px-6 py-5">
              {payment.timeline.map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{
                        background: i === payment.timeline.length - 1 ? status.color : "var(--border-subtle)",
                        border: `2px solid ${i === payment.timeline.length - 1 ? status.color : "var(--border-subtle)"}`,
                      }}
                    />
                    {i < payment.timeline.length - 1 && (
                      <div className="w-px flex-1 my-1" style={{ background: "var(--border-subtle)", minHeight: "20px" }} />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-[11px] font-mono mb-0.5" style={{ color: "var(--text-tertiary)" }}>{event.date}</p>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{event.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: buyer + gateway + actions */}
        <div className="space-y-5">
          {/* Buyer */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Buyer</h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: "var(--surface-secondary)" }}>
                {payment.buyerCountry}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{payment.buyerName}</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{payment.buyerEmail}</p>
              </div>
            </div>
          </div>

          {/* Gateway details */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2">
              <GwIcon className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Gateway Details</h2>
            </div>
            {[
              { label: "Provider",  value: gw.label },
              { label: "Reference", value: payment.reference },
              { label: "Initiated", value: payment.createdAt },
              { label: "Settled",   value: payment.settledAt ?? "—" },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{row.label}</p>
                <p className="text-sm font-mono font-medium break-all" style={{ color: "var(--text-primary)" }}>{row.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          {(payment.status === "failed" || payment.status === "completed" || payment.status === "disputed") && (
            <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>
              {payment.status === "failed" && (
                <button
                  onClick={() => handleAction("retry")}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}
                >
                  {actionLoading === "retry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Retry Payment
                </button>
              )}
              {payment.status === "completed" && (
                <button
                  onClick={() => handleAction("refund")}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--indigo)", borderColor: "color-mix(in srgb, var(--indigo) 25%, transparent)", background: "color-mix(in srgb, var(--indigo) 8%, transparent)" }}
                >
                  {actionLoading === "refund" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Issue Refund
                </button>
              )}
              {payment.status === "disputed" && (
                <Link
                  href="/admin/disputes"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  View Dispute
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
