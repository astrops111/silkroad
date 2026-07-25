"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  ChevronDown,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Smartphone,
  Building,
  DollarSign,
  RotateCcw,
  Loader2,
} from "lucide-react";

type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded" | "expired" | "cancelled";
type Gateway = "stripe" | "flutterwave" | "mtn_momo" | "airtel_money" | "tigo_cash" | "mpesa" | "bank_transfer" | "escrow" | "platform_wallet" | "xtransfer" | "alipay" | "wechat_pay";

interface Payment {
  id: string;
  purchase_order_id: string | null;
  gateway: Gateway;
  gateway_transaction_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string | null;
  order: {
    order_number: string;
    buyer_company_name: string | null;
    user_profiles: { full_name: string | null; country_code: string | null } | null;
  } | null;
}

const statusConfig: Record<PaymentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  succeeded:  { label: "Succeeded",  color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending:    { label: "Pending",    color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  processing: { label: "Processing", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  failed:     { label: "Failed",     color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
  refunded:   { label: "Refunded",   color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: RotateCcw },
  expired:    { label: "Expired",    color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: AlertTriangle },
  cancelled:  { label: "Cancelled",  color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: XCircle },
};

const gatewayConfig: Record<string, { label: string; icon: typeof CreditCard }> = {
  stripe: { label: "Stripe", icon: CreditCard },
  flutterwave: { label: "Flutterwave", icon: CreditCard },
  mtn_momo: { label: "MTN MoMo", icon: Smartphone },
  airtel_money: { label: "Airtel Money", icon: Smartphone },
  tigo_cash: { label: "Tigo Cash", icon: Smartphone },
  mpesa: { label: "M-Pesa", icon: Smartphone },
  bank_transfer: { label: "Bank Transfer", icon: Building },
  escrow: { label: "Escrow", icon: Building },
  platform_wallet: { label: "Platform Wallet", icon: Building },
  xtransfer: { label: "XTransfer", icon: Building },
  alipay: { label: "Alipay", icon: CreditCard },
  wechat_pay: { label: "WeChat Pay", icon: CreditCard },
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [kpis, setKpis] = useState<{ totalVolumeUsd30d: number; successfulCount30d: number; failedCount30d: number; refundedUsd30d: number } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (gatewayFilter !== "all") params.set("gateway", gatewayFilter);
    if (search) params.set("search", search);

    const handle = setTimeout(async () => {
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) {
        setPayments([]);
        return;
      }
      const data = await res.json();
      setPayments(data.payments ?? []);
      setKpis(data.kpis ?? null);
    }, 250);

    return () => clearTimeout(handle);
  }, [search, statusFilter, gatewayFilter]);

  const kpiCards = [
    { label: "Total Volume (30d)", value: kpis ? formatUsd(kpis.totalVolumeUsd30d) : "—", icon: DollarSign, accent: "var(--amber)" },
    { label: "Successful Payments (30d)", value: kpis ? kpis.successfulCount30d.toLocaleString() : "—", icon: CheckCircle2, accent: "var(--success)" },
    { label: "Failed (30d)", value: kpis ? kpis.failedCount30d.toLocaleString() : "—", icon: XCircle, accent: "var(--danger)" },
    { label: "Refunds Issued (30d)", value: kpis ? formatUsd(kpis.refundedUsd30d) : "—", icon: RotateCcw, accent: "var(--indigo)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Payments
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Transaction ledger across all payment gateways
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {kpi.value}
            </p>
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            <option value="all">All Status</option>
            {Object.keys(statusConfig).map((s) => (
              <option key={s} value={s}>{statusConfig[s as PaymentStatus].label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
        <div className="relative">
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            <option value="all">All Gateways</option>
            {Object.keys(gatewayConfig).map((g) => (
              <option key={g} value={g}>{gatewayConfig[g].label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {payments === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Reference", "Order", "Buyer", "Amount", "Gateway", "Status", "Date", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const status = statusConfig[payment.status] ?? statusConfig.pending;
                  const StatusIcon = status.icon;
                  const gw = gatewayConfig[payment.gateway] ?? { label: payment.gateway, icon: CreditCard };
                  const GwIcon = gw.icon;
                  return (
                    <tr key={payment.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>
                          {payment.gateway_transaction_id ?? payment.id.slice(0, 8)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--indigo)" }}>
                          {payment.order?.order_number ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {payment.order?.buyer_company_name ?? payment.order?.user_profiles?.full_name ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: payment.status === "refunded" ? "var(--indigo)" : "var(--text-primary)",
                            textDecoration: payment.status === "refunded" ? "line-through" : "none",
                          }}
                        >
                          {formatAmount(payment.amount, payment.currency)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <GwIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{gw.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {new Date(payment.created_at).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="p-1.5 rounded-lg transition-colors inline-flex items-center"
                          style={{ color: "var(--text-tertiary)" }}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                      No transactions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
