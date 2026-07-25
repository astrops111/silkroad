"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, CreditCard, CheckCircle2, Clock, XCircle, AlertTriangle,
  RotateCcw, Smartphone, Building, Copy, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded" | "expired" | "cancelled";

interface PaymentDetail {
  id: string;
  purchase_order_id: string | null;
  supplier_order_id: string | null;
  gateway: string;
  gateway_transaction_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  order: {
    order_number: string;
    buyer_company_name: string | null;
    market_region: string | null;
    user_profiles: { full_name: string | null; country_code: string | null } | null;
  } | null;
}

const statusConfig: Record<PaymentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  succeeded:  { label: "Succeeded",  color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending:    { label: "Pending",    color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  processing: { label: "Processing", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  failed:     { label: "Failed",     color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger)  10%, transparent)", icon: XCircle },
  refunded:   { label: "Refunded",   color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo)  10%, transparent)", icon: RotateCcw },
  expired:    { label: "Expired",    color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: AlertTriangle },
  cancelled:  { label: "Cancelled",  color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: XCircle },
};

const gatewayIcon: Record<string, typeof CreditCard> = {
  stripe: CreditCard, flutterwave: CreditCard, alipay: CreditCard, wechat_pay: CreditCard,
  mtn_momo: Smartphone, airtel_money: Smartphone, tigo_cash: Smartphone, mpesa: Smartphone,
  bank_transfer: Building, escrow: Building, platform_wallet: Building, xtransfer: Building,
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentDetail | null | undefined>(undefined);
  const [refunding, setRefunding] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/payments?id=${id}`);
    const data = await res.json();
    setPayment(data.payments?.[0] ?? null);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (payment === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CreditCard className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Payment not found</p>
        <Link href="/admin/payments" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to payments</Link>
      </div>
    );
  }

  const status = statusConfig[payment.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;
  const GwIcon = gatewayIcon[payment.gateway] ?? CreditCard;

  async function handleRefund() {
    if (!payment?.supplier_order_id) {
      toast.error("This payment isn't tied to a single supplier order — issue the refund from the order's dispute instead.");
      return;
    }
    const reason = window.prompt("Reason for refund (shown in the order history):");
    if (!reason) return;
    setRefunding(true);
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierOrderId: payment.supplier_order_id, reason, type: "full" }),
    });
    const data = await res.json();
    setRefunding(false);
    if (!res.ok) {
      toast.error(data.error || "Refund failed");
      return;
    }
    toast.success("Refund issued");
    load();
  }

  function copyReference() {
    if (payment?.gateway_transaction_id) {
      navigator.clipboard.writeText(payment.gateway_transaction_id);
      toast.success("Reference copied");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/payments" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Payments
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-secondary)" }}>
              <GwIcon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {formatAmount(payment.amount, payment.currency)}
              </h1>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{payment.order?.order_number ?? "—"}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {[
          { label: "Buyer", value: payment.order?.buyer_company_name ?? payment.order?.user_profiles?.full_name ?? "—" },
          { label: "Gateway", value: payment.gateway },
          { label: "Created", value: new Date(payment.created_at).toLocaleString() },
          { label: "Last updated", value: payment.updated_at ? new Date(payment.updated_at).toLocaleString() : "—" },
          { label: "Expires", value: payment.expires_at ? new Date(payment.expires_at).toLocaleString() : "—" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-tertiary)" }}>{row.label}</span>
            <span style={{ color: "var(--text-primary)" }}>{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--text-tertiary)" }}>Reference</span>
          <button onClick={copyReference} className="inline-flex items-center gap-1.5 font-mono" style={{ color: "var(--text-primary)" }}>
            {payment.gateway_transaction_id ?? "—"}
            {payment.gateway_transaction_id && <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />}
          </button>
        </div>
      </div>

      {payment.status === "succeeded" && (
        <button
          onClick={handleRefund}
          disabled={refunding}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "color-mix(in srgb, var(--indigo) 10%, transparent)", color: "var(--indigo)" }}
        >
          {refunding ? <Loader2 className="w-4 h-4 inline animate-spin mr-1.5" /> : null}
          Issue Full Refund
        </button>
      )}
    </div>
  );
}
