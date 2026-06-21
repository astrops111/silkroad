"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Landmark, CheckCircle2, XCircle, Clock,
  Smartphone, CreditCard, Building, Loader2, Download, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type SettlementStatus = "pending" | "paid" | "failed";
type PayoutMethod = "mtn_momo" | "stripe" | "bank_transfer";
interface ContributingOrder { orderNumber: string; date: string; buyer: string; amount: number; }
interface SettlementDetail {
  id: string; supplierName: string; supplierCountry: string;
  period: string; grossSales: number; commission: number; netPayout: number;
  commissionRate: number; payoutMethod: PayoutMethod; status: SettlementStatus;
  bankDetails: string; orders: ContributingOrder[]; processedAt: string | null;
}

/* ------------------------------------------------------------------ */
/*  Mock data (mirrors settlements list)                                */
/* ------------------------------------------------------------------ */
const SETTLEMENTS: SettlementDetail[] = [
  { id: "SET-001", supplierName: "Guangzhou Huawei Electronics Ltd.", supplierCountry: "🇨🇳", period: "Apr 1 - 15, 2025", grossSales: 24800, commission: 1984, netPayout: 22816, commissionRate: 8, payoutMethod: "stripe", status: "paid", bankDetails: "Stripe acct_1NxHWo2eZvKYlo2C", processedAt: "2025-04-17", orders: [{ orderNumber: "ORD-2025-4866", date: "2025-04-13", buyer: "Lagos MegaStore", amount: 15200 }, { orderNumber: "ORD-2025-4853", date: "2025-04-09", buyer: "Cairo Electronics", amount: 9600 }] },
  { id: "SET-002", supplierName: "Nairobi Fresh Produce Co-op", supplierCountry: "🇰🇪", period: "Apr 1 - 15, 2025", grossSales: 8640, commission: 691, netPayout: 7949, commissionRate: 8, payoutMethod: "mtn_momo", status: "pending", bankDetails: "MTN +254 700 123 456", processedAt: null, orders: [{ orderNumber: "ORD-2025-4867", date: "2025-04-16", buyer: "Guangzhou Import Co.", amount: 5400 }, { orderNumber: "ORD-2025-4849", date: "2025-04-08", buyer: "Shanghai Imports", amount: 3240 }] },
  { id: "SET-003", supplierName: "Shenzhen TechParts Co.", supplierCountry: "🇨🇳", period: "Apr 1 - 15, 2025", grossSales: 52100, commission: 4168, netPayout: 47932, commissionRate: 8, payoutMethod: "bank_transfer", status: "paid", bankDetails: "SWIFT: HSBCHKHH · Acct 4892011234", processedAt: "2025-04-17", orders: [{ orderNumber: "ORD-2025-4871", date: "2025-04-16", buyer: "TechHub Ghana Ltd.", amount: 12400 }, { orderNumber: "ORD-2025-4868", date: "2025-04-12", buyer: "Dar es Salaam Wholesale", amount: 5430 }, { orderNumber: "ORD-2025-4865", date: "2025-04-11", buyer: "Mombasa Traders Ltd.", amount: 34270 }] },
  { id: "SET-004", supplierName: "Kigali Coffee Collective", supplierCountry: "🇷🇼", period: "Apr 1 - 15, 2025", grossSales: 6200, commission: 496, netPayout: 5704, commissionRate: 8, payoutMethod: "mtn_momo", status: "pending", bankDetails: "MTN +250 788 456 789", processedAt: null, orders: [{ orderNumber: "ORD-2025-4869", date: "2025-04-14", buyer: "Shanghai Imports", amount: 6200 }] },
  { id: "SET-005", supplierName: "Lagos Industrial Supplies", supplierCountry: "🇳🇬", period: "Mar 16 - 31, 2025", grossSales: 3800, commission: 304, netPayout: 3496, commissionRate: 8, payoutMethod: "bank_transfer", status: "failed", bankDetails: "GTBank 0123456789 (routing failed)", processedAt: null, orders: [{ orderNumber: "ORD-2025-4840", date: "2025-03-28", buyer: "Cairo Electronics", amount: 3800 }] },
  { id: "SET-006", supplierName: "Addis Ababa Textiles PLC", supplierCountry: "🇪🇹", period: "Apr 1 - 15, 2025", grossSales: 4500, commission: 360, netPayout: 4140, commissionRate: 8, payoutMethod: "bank_transfer", status: "pending", bankDetails: "CBE SWIFT: CBETETAA · Acct 1000123456", processedAt: null, orders: [{ orderNumber: "ORD-2025-4867", date: "2025-04-16", buyer: "Guangzhou Import Co.", amount: 4500 }] },
  { id: "SET-007", supplierName: "Dongguan Plastics Manufacturing", supplierCountry: "🇨🇳", period: "Apr 1 - 15, 2025", grossSales: 18200, commission: 1456, netPayout: 16744, commissionRate: 8, payoutMethod: "stripe", status: "paid", bankDetails: "Stripe acct_1MxPLr3eZvKYlo2D", processedAt: "2025-04-17", orders: [{ orderNumber: "ORD-2025-4870", date: "2025-04-15", buyer: "Kampala Retail Group", amount: 10500 }, { orderNumber: "ORD-2025-4865", date: "2025-04-11", buyer: "Mombasa Traders Ltd.", amount: 7700 }] },
];

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const statusConfig: Record<SettlementStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  paid:    { label: "Paid",    color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  failed:  { label: "Failed",  color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
};
const payoutMethodConfig: Record<PayoutMethod, { label: string; icon: typeof CreditCard }> = {
  mtn_momo:      { label: "MTN Mobile Money", icon: Smartphone },
  stripe:        { label: "Stripe",           icon: CreditCard },
  bank_transfer: { label: "Bank Transfer",    icon: Building },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const settlement = SETTLEMENTS.find((s) => s.id === id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!settlement) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Landmark className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Settlement not found</p>
        <Link href="/admin/settlements" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to settlements</Link>
      </div>
    );
  }

  const status = statusConfig[settlement.status];
  const StatusIcon = status.icon;
  const payout = payoutMethodConfig[settlement.payoutMethod];
  const PayoutIcon = payout.icon;

  async function handleAction(action: string) {
    setActionLoading(action);
    await new Promise((r) => setTimeout(r, 800));
    setActionLoading(null);
    if (action === "process") toast.success("Payout initiated");
    else if (action === "retry") toast.success("Payout retried");
    else toast.success("PDF exported");
  }

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
                {settlement.supplierCountry} {settlement.supplierName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>{settlement.id} · {settlement.period}</p>
          </div>
          <button onClick={() => handleAction("export")} disabled={!!actionLoading} className="btn-outline !py-2 !px-4 !text-sm shrink-0">
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
            { label: "Gross Sales",  value: `$${settlement.grossSales.toLocaleString()}`,  note: `${settlement.orders.length} orders`,        accent: "var(--text-primary)" },
            { label: "Platform Fee", value: `-$${settlement.commission.toLocaleString()}`, note: `${settlement.commissionRate}% commission`,   accent: "var(--danger)" },
            { label: "Net Payout",   value: `$${settlement.netPayout.toLocaleString()}`,   note: "Amount due to supplier",                    accent: "var(--success)" },
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
        {/* Left: contributing orders */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <Landmark className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Contributing Orders ({settlement.orders.length})
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Order", "Date", "Buyer", "Amount"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settlement.orders.map((o) => (
                  <tr key={o.orderNumber}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-3.5"><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{o.orderNumber}</span></td>
                    <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(o.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></td>
                    <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{o.buyer}</span></td>
                    <td className="px-5 py-3.5"><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>${o.amount.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-secondary)" }}>
                  <td colSpan={3} className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Total</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      ${settlement.orders.reduce((s, o) => s + o.amount, 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
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
              { label: "Amount",    value: `$${settlement.netPayout.toLocaleString()}` },
              { label: "Account",   value: settlement.bankDetails },
              { label: "Processed", value: settlement.processedAt ?? "Pending" },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>{row.label}</p>
                <p className="text-sm font-medium break-all" style={{ color: "var(--text-primary)" }}>{row.value}</p>
              </div>
            ))}
          </div>

          {(settlement.status === "pending" || settlement.status === "failed") && (
            <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>
              {settlement.status === "pending" && (
                <button onClick={() => handleAction("process")} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--success)", color: "white" }}>
                  {actionLoading === "process" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Process Payout
                </button>
              )}
              {settlement.status === "failed" && (
                <button onClick={() => handleAction("retry")} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
                  {actionLoading === "retry" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{settlement.processedAt}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
