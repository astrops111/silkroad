"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface PaymentTransaction {
  id: string;
  gateway: string;
  status: string;
  amount: number;
  currency: string;
  order_number: string;
  mobile_money_phone: string | null;
  created_at: string;
}

const GATEWAY_CONFIG: Record<string, { label: string; icon: typeof CreditCard; color: string }> = {
  stripe: { label: "Card / Stripe", icon: CreditCard, color: "var(--indigo)" },
  mtn_momo: { label: "MTN MoMo", icon: Smartphone, color: "var(--amber)" },
  airtel_money: { label: "Airtel Money", icon: Smartphone, color: "var(--terracotta)" },
  mpesa: { label: "M-Pesa", icon: Smartphone, color: "var(--success)" },
  bank_transfer: { label: "Bank Transfer", icon: Building2, color: "var(--text-tertiary)" },
  alipay: { label: "Alipay", icon: CreditCard, color: "var(--info)" },
  wechat_pay: { label: "WeChat Pay", icon: CreditCard, color: "var(--success)" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  succeeded: { label: "Paid", color: "var(--success)", icon: CheckCircle2 },
  pending: { label: "Pending", color: "var(--amber)", icon: Clock },
  processing: { label: "Processing", color: "var(--indigo)", icon: Clock },
  failed: { label: "Failed", color: "var(--danger)", icon: XCircle },
  refunded: { label: "Refunded", color: "var(--terracotta)", icon: ArrowUpRight },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/buyer/payments")
      .then((r) => r.json())
      .then((d) => setPayments(d.payments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const totalPaid = payments
    .filter((p) => p.status === "succeeded")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Payment History
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          All your payment transactions across mobile money, card, and bank transfer
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            ${(totalPaid / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Total Paid</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {payments.length}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Transactions</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {payments.filter((p) => p.status === "pending").length}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Pending</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface-tertiary)" }}>
        {["all", "succeeded", "pending", "failed", "refunded"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
            style={{
              background: filter === f ? "var(--surface-primary)" : "transparent",
              color: filter === f ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-tertiary)" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No transactions found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {filtered.map((tx) => {
              const gw = GATEWAY_CONFIG[tx.gateway] || { label: tx.gateway, icon: CreditCard, color: "var(--text-tertiary)" };
              const st = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
              const GwIcon = gw.icon;
              const StIcon = st.icon;

              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${gw.color} 12%, transparent)` }}>
                    <GwIcon className="w-4 h-4" style={{ color: gw.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{gw.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {tx.order_number || "—"} • {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      {tx.currency} {(tx.amount / 100).toFixed(2)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: st.color }}>
                      <StIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
