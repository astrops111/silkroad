"use client";

import {
  Landmark,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Download,
  Search,
  Filter,
  ChevronDown,
  Smartphone,
  CreditCard,
  Building,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */
type SettlementStatus = "pending" | "paid" | "failed";
type PayoutMethod = "mtn_momo" | "stripe" | "bank_transfer";

interface Settlement {
  id: string;
  supplierName: string;
  supplierCountry: string;
  period: string;
  grossSales: number;
  commission: number;
  netPayout: number;
  payoutMethod: PayoutMethod;
  status: SettlementStatus;
}

const kpis = [
  {
    label: "Pending Payouts",
    value: "$48,320",
    icon: Clock,
    accent: "var(--warning)",
  },
  {
    label: "Commission This Month",
    value: "$12,450",
    icon: TrendingUp,
    accent: "var(--success)",
  },
  {
    label: "Settlement Count",
    value: "156",
    icon: Landmark,
    accent: "var(--indigo)",
  },
];

const settlements: Settlement[] = [
  {
    id: "SET-001",
    supplierName: "Guangzhou Huawei Electronics Ltd.",
    supplierCountry: "\uD83C\uDDE8\uD83C\uDDF3",
    period: "Apr 1 - 15, 2025",
    grossSales: 24800,
    commission: 1984,
    netPayout: 22816,
    payoutMethod: "stripe",
    status: "paid",
  },
  {
    id: "SET-002",
    supplierName: "Nairobi Fresh Produce Co-op",
    supplierCountry: "\uD83C\uDDF0\uD83C\uDDEA",
    period: "Apr 1 - 15, 2025",
    grossSales: 8640,
    commission: 691,
    netPayout: 7949,
    payoutMethod: "mtn_momo",
    status: "pending",
  },
  {
    id: "SET-003",
    supplierName: "Shenzhen TechParts Co.",
    supplierCountry: "\uD83C\uDDE8\uD83C\uDDF3",
    period: "Apr 1 - 15, 2025",
    grossSales: 52100,
    commission: 4168,
    netPayout: 47932,
    payoutMethod: "bank_transfer",
    status: "paid",
  },
  {
    id: "SET-004",
    supplierName: "Kigali Coffee Collective",
    supplierCountry: "\uD83C\uDDF7\uD83C\uDDFC",
    period: "Apr 1 - 15, 2025",
    grossSales: 6200,
    commission: 496,
    netPayout: 5704,
    payoutMethod: "mtn_momo",
    status: "pending",
  },
  {
    id: "SET-005",
    supplierName: "Lagos Industrial Supplies",
    supplierCountry: "\uD83C\uDDF3\uD83C\uDDEC",
    period: "Mar 16 - 31, 2025",
    grossSales: 3800,
    commission: 304,
    netPayout: 3496,
    payoutMethod: "bank_transfer",
    status: "failed",
  },
  {
    id: "SET-006",
    supplierName: "Addis Ababa Textiles PLC",
    supplierCountry: "\uD83C\uDDEA\uD83C\uDDF9",
    period: "Apr 1 - 15, 2025",
    grossSales: 4500,
    commission: 360,
    netPayout: 4140,
    payoutMethod: "bank_transfer",
    status: "pending",
  },
  {
    id: "SET-007",
    supplierName: "Dongguan Plastics Manufacturing",
    supplierCountry: "\uD83C\uDDE8\uD83C\uDDF3",
    period: "Apr 1 - 15, 2025",
    grossSales: 18200,
    commission: 1456,
    netPayout: 16744,
    payoutMethod: "stripe",
    status: "paid",
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const statusConfig: Record<
  SettlementStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: "Pending",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    icon: Clock,
  },
  paid: {
    label: "Paid",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
    icon: XCircle,
  },
};

const payoutMethodConfig: Record<
  PayoutMethod,
  { label: string; icon: typeof CreditCard }
> = {
  mtn_momo: { label: "MTN MoMo", icon: Smartphone },
  stripe: { label: "Stripe", icon: CreditCard },
  bank_transfer: { label: "Bank Transfer", icon: Building },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SettlementsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Financial Settlements
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Commission tracking and supplier payout management
          </p>
        </div>
        <button className="btn-outline !py-2 !px-4 !text-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-6 rounded-2xl border"
            style={{
              background: "var(--surface-primary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}
              >
                <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
              </div>
            </div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {kpi.value}
            </p>
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by supplier name..."
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
          />
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <Filter className="w-4 h-4" />
          Status
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Settlements Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {[
                  "Supplier",
                  "Period",
                  "Gross Sales",
                  "Commission",
                  "Net Payout",
                  "Payout Method",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => {
                const status = statusConfig[s.status];
                const StatusIcon = status.icon;
                const payout = payoutMethodConfig[s.payoutMethod];
                const PayoutIcon = payout.icon;

                return (
                  <tr
                    key={s.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--surface-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Supplier */}
                    <td className="px-5 py-4">
                      <div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {s.supplierCountry} {s.supplierName}
                        </span>
                        <br />
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {s.id}
                        </span>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {s.period}
                      </span>
                    </td>

                    {/* Gross Sales */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        ${s.grossSales.toLocaleString()}
                      </span>
                    </td>

                    {/* Commission */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium" style={{ color: "var(--amber-dark)" }}>
                        ${s.commission.toLocaleString()}
                      </span>
                      <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>
                        (8%)
                      </span>
                    </td>

                    {/* Net Payout */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        ${s.netPayout.toLocaleString()}
                      </span>
                    </td>

                    {/* Payout Method */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <PayoutIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {payout.label}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: status.color, background: status.bg }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {s.status === "pending" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--success) 12%, transparent)",
                              color: "var(--success)",
                            }}
                          >
                            Process Payout
                          </button>
                        )}
                        {s.status === "failed" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--warning) 10%, transparent)",
                              color: "var(--warning)",
                            }}
                          >
                            Retry
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex gap-8">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Total Gross
              </span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                ${settlements.reduce((a, s) => a + s.grossSales, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Total Commission
              </span>
              <p className="text-sm font-bold" style={{ color: "var(--amber-dark)" }}>
                ${settlements.reduce((a, s) => a + s.commission, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Total Net Payouts
              </span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                ${settlements.reduce((a, s) => a + s.netPayout, 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {[1, 2].map((p) => (
              <button
                key={p}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: p === 1 ? "var(--obsidian)" : "transparent",
                  color: p === 1 ? "var(--ivory)" : "var(--text-tertiary)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
