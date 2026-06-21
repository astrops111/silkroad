"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  ChevronDown,
  Eye,
  MoreHorizontal,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Building,
  DollarSign,
  RotateCcw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */
type PaymentStatus = "completed" | "pending" | "failed" | "refunded" | "disputed";
type Gateway = "stripe" | "flutterwave" | "mtn_momo" | "airtel_money" | "mpesa" | "bank_transfer" | "xtransfer";

interface Payment {
  id: string;
  orderId: string;
  buyerName: string;
  buyerCountry: string;
  amount: number;
  gateway: Gateway;
  status: PaymentStatus;
  createdAt: string;
  settledAt: string | null;
  reference: string;
}

const payments: Payment[] = [
  {
    id: "PAY-20260415-001",
    orderId: "SR-20260415-001",
    buyerName: "Nairobi Imports Ltd",
    buyerCountry: "🇰🇪",
    amount: 12400,
    gateway: "mpesa",
    status: "completed",
    createdAt: "2026-04-15 14:32",
    settledAt: "2026-04-15 14:35",
    reference: "MPE-7X4K2L",
  },
  {
    id: "PAY-20260414-003",
    orderId: "SR-20260414-002",
    buyerName: "TechHub Ghana",
    buyerCountry: "🇬🇭",
    amount: 8750,
    gateway: "mtn_momo",
    status: "completed",
    createdAt: "2026-04-14 09:18",
    settledAt: "2026-04-14 09:21",
    reference: "MTN-93KJ1P",
  },
  {
    id: "PAY-20260413-007",
    orderId: "SR-20260413-005",
    buyerName: "Cairo Electronics",
    buyerCountry: "🇪🇬",
    amount: 31200,
    gateway: "stripe",
    status: "completed",
    createdAt: "2026-04-13 16:45",
    settledAt: "2026-04-14 08:00",
    reference: "pi_3QxK9s",
  },
  {
    id: "PAY-20260412-009",
    orderId: "SR-20260412-008",
    buyerName: "Lagos Distribution Co",
    buyerCountry: "🇳🇬",
    amount: 5600,
    gateway: "flutterwave",
    status: "failed",
    createdAt: "2026-04-12 11:10",
    settledAt: null,
    reference: "FW-ERR-4921",
  },
  {
    id: "PAY-20260411-002",
    orderId: "SR-20260411-003",
    buyerName: "Kigali Fresh Markets",
    buyerCountry: "🇷🇼",
    amount: 4200,
    gateway: "mtn_momo",
    status: "pending",
    createdAt: "2026-04-11 08:55",
    settledAt: null,
    reference: "MTN-PND-0038",
  },
  {
    id: "PAY-20260410-011",
    orderId: "SR-20260408-003",
    buyerName: "TechHub Ghana",
    buyerCountry: "🇬🇭",
    amount: 2400,
    gateway: "stripe",
    status: "refunded",
    createdAt: "2026-04-10 13:22",
    settledAt: "2026-04-10 13:25",
    reference: "pi_3QwA1r_refund",
  },
  {
    id: "PAY-20260409-005",
    orderId: "SR-20260405-012",
    buyerName: "Nairobi Imports Ltd",
    buyerCountry: "🇰🇪",
    amount: 560,
    gateway: "mpesa",
    status: "disputed",
    createdAt: "2026-04-09 17:04",
    settledAt: null,
    reference: "MPE-DIS-1129",
  },
  {
    id: "PAY-20260408-014",
    orderId: "SR-20260407-006",
    buyerName: "Dar Trading House",
    buyerCountry: "🇹🇿",
    amount: 9800,
    gateway: "airtel_money",
    status: "completed",
    createdAt: "2026-04-08 10:30",
    settledAt: "2026-04-08 10:34",
    reference: "AIR-62MN9A",
  },
  {
    id: "PAY-20260406-018",
    orderId: "SR-20260405-010",
    buyerName: "Addis Trade Partners",
    buyerCountry: "🇪🇹",
    amount: 19200,
    gateway: "bank_transfer",
    status: "completed",
    createdAt: "2026-04-06 14:00",
    settledAt: "2026-04-07 09:00",
    reference: "WIRE-ET-00291",
  },
  {
    id: "PAY-20260404-022",
    orderId: "SR-20260403-014",
    buyerName: "Kampala Wholesale Group",
    buyerCountry: "🇺🇬",
    amount: 6700,
    gateway: "mtn_momo",
    status: "failed",
    createdAt: "2026-04-04 08:15",
    settledAt: null,
    reference: "MTN-FAIL-0074",
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const statusConfig: Record<PaymentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  completed: {
    label: "Completed",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    color: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    color: "var(--indigo)",
    bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",
    icon: RotateCcw,
  },
  disputed: {
    label: "Disputed",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    icon: AlertTriangle,
  },
};

const gatewayConfig: Record<Gateway, { label: string; icon: typeof CreditCard }> = {
  stripe: { label: "Stripe", icon: CreditCard },
  flutterwave: { label: "Flutterwave", icon: CreditCard },
  mtn_momo: { label: "MTN MoMo", icon: Smartphone },
  airtel_money: { label: "Airtel Money", icon: Smartphone },
  mpesa: { label: "M-Pesa", icon: Smartphone },
  bank_transfer: { label: "Bank Transfer", icon: Building },
  xtransfer: { label: "XTransfer", icon: Building },
};

const kpis = [
  { label: "Total Volume (30d)", value: "$284,700", change: "+9.4%", icon: DollarSign, accent: "var(--amber)" },
  { label: "Successful Payments", value: "1,284", change: "+6.2%", icon: CheckCircle2, accent: "var(--success)" },
  { label: "Failed / Retrying", value: "18", change: "-2", icon: XCircle, accent: "var(--danger)" },
  { label: "Refunds Issued", value: "$4,320", change: "+1", icon: RotateCcw, accent: "var(--indigo)" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");

  const filtered = payments.filter((p) => {
    const matchesSearch =
      !search ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId.toLowerCase().includes(search.toLowerCase()) ||
      p.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesGateway = gatewayFilter === "all" || p.gateway === gatewayFilter;
    return matchesSearch && matchesStatus && matchesGateway;
  });

  const totalVolume = filtered.reduce(
    (sum, p) => sum + (p.status === "completed" ? p.amount : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Payments
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Transaction ledger across all payment gateways
          </p>
        </div>
        <button className="btn-outline !py-2 !px-4 !text-sm">
          <Download className="w-4 h-4" />
          Export Ledger
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-6 rounded-2xl border"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}
              >
                <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}
              >
                {kpi.change}
              </span>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-md"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by payment ID, order, buyer, or reference..."
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
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="disputed">Disputed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
        <div className="relative">
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="all">All Gateways</option>
            <option value="stripe">Stripe</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="airtel_money">Airtel Money</option>
            <option value="mpesa">M-Pesa</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="xtransfer">XTransfer</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Payment ID", "Order", "Buyer", "Amount", "Gateway", "Status", "Date", "Actions"].map((h) => (
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
              {filtered.map((payment) => {
                const status = statusConfig[payment.status];
                const StatusIcon = status.icon;
                const gw = gatewayConfig[payment.gateway];
                const GwIcon = gw.icon;
                return (
                  <tr
                    key={payment.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                        {payment.id}
                      </p>
                      <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                        ref: {payment.reference}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-medium" style={{ color: "var(--indigo)" }}>
                        {payment.orderId}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {payment.buyerCountry} {payment.buyerName}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            payment.status === "refunded"
                              ? "var(--indigo)"
                              : payment.status === "failed"
                              ? "var(--text-tertiary)"
                              : "var(--text-primary)",
                          textDecoration: payment.status === "refunded" ? "line-through" : "none",
                        }}
                      >
                        ${payment.amount.toLocaleString()}
                      </span>
                      {payment.status === "refunded" && (
                        <p className="text-xs" style={{ color: "var(--indigo)" }}>
                          Refunded
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <GwIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {gw.label}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: status.color, background: status.bg }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {payment.createdAt}
                      </p>
                      {payment.settledAt && (
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          settled {payment.settledAt}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="p-1.5 rounded-lg transition-colors inline-flex items-center"
                          style={{ color: "var(--text-tertiary)" }}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {payment.status === "failed" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--warning) 10%, transparent)",
                              color: "var(--warning)",
                            }}
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" />
                            Retry
                          </button>
                        )}
                        {payment.status === "completed" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--indigo) 10%, transparent)",
                              color: "var(--indigo)",
                            }}
                          >
                            Refund
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

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex gap-8">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Showing
              </span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {filtered.length} transactions
              </p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Completed Volume
              </span>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                ${totalVolume.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((p) => (
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
