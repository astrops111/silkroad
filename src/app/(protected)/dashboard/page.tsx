"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  FileText,
  Truck,
  CreditCard,
  ArrowUpRight,
  MessageSquare,
  Bell,
  ChevronRight,
  Loader2,
  RefreshCw,
  Plus,
  Store,
  Clock,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */
interface DashboardData {
  buyer: {
    name: string;
    companyName: string | null;
    countryCode: string | null;
  };
  kpis: {
    totalOrders: number;
    activeRfqs: number;
    inTransit: number;
    totalSpend: number;
    unreadMessages: number;
    unreadNotifications: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    total: number;
    currency: string;
    status: string;
    supplierCount: number;
    createdAt: string;
  }[];
  recentRfqs: {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    quotation_count: number;
    deadline: string | null;
    created_at: string;
  }[];
  monthlySpend: { month: string; spend: number }[];
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatCurrencyCompact(amount: number, currency = "USD"): string {
  const value = amount / 100;
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 1_000_000).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `${new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value / 1_000).replace(/\.0$/, "")}K`;
  }
  return formatCurrency(amount, currency);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function deadlineCountdown(deadlineStr: string | null): string {
  if (!deadlineStr) return "No deadline";
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs < 0) return "Expired";
  const diffDays = Math.floor(diffMs / 86400000);
  const diffHours = Math.floor((diffMs % 86400000) / 3600000);
  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  return "< 1h left";
}

/* ============================================================
   STATUS CONFIGS
   ============================================================ */
const ORDER_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending_payment: { label: "Pending Payment", bg: "rgba(128,128,128,0.1)", text: "var(--text-tertiary)" },
  paid:            { label: "Paid",            bg: "color-mix(in srgb, var(--amber) 12%, transparent)", text: "var(--amber-dark)" },
  confirmed:       { label: "Confirmed",       bg: "color-mix(in srgb, var(--indigo) 12%, transparent)", text: "var(--indigo)" },
  shipped:         { label: "Shipped",         bg: "color-mix(in srgb, var(--info) 12%, transparent)", text: "var(--info)" },
  delivered:       { label: "Delivered",        bg: "color-mix(in srgb, var(--success) 12%, transparent)", text: "var(--success)" },
  completed:       { label: "Completed",        bg: "color-mix(in srgb, var(--success) 12%, transparent)", text: "var(--success)" },
};

const RFQ_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: "Draft",     bg: "rgba(128,128,128,0.1)", text: "var(--text-tertiary)" },
  open:      { label: "Open",      bg: "color-mix(in srgb, var(--indigo) 12%, transparent)", text: "var(--indigo)" },
  closed:    { label: "Closed",    bg: "color-mix(in srgb, var(--amber) 12%, transparent)", text: "var(--amber-dark)" },
  awarded:   { label: "Awarded",   bg: "color-mix(in srgb, var(--success) 12%, transparent)", text: "var(--success)" },
  cancelled: { label: "Cancelled", bg: "color-mix(in srgb, var(--danger) 12%, transparent)", text: "var(--danger)" },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; bg: string; text: string }> }) {
  const cfg = map[status] ?? { label: status.replace(/_/g, " "), bg: "rgba(128,128,128,0.1)", text: "var(--text-tertiary)" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

/* ============================================================
   KPI CARDS
   ============================================================ */
function KpiCards({ kpis }: { kpis: DashboardData["kpis"] }) {
  const cards = [
    {
      label: "Total Orders",
      value: kpis.totalOrders.toLocaleString(),
      sub: "all time",
      icon: ShoppingCart,
      accent: "var(--amber)",
    },
    {
      label: "Active RFQs",
      value: kpis.activeRfqs.toLocaleString(),
      sub: "awaiting quotes",
      icon: FileText,
      accent: "var(--indigo)",
    },
    {
      label: "In Transit",
      value: kpis.inTransit.toLocaleString(),
      sub: "shipments",
      icon: Truck,
      accent: "var(--terracotta)",
    },
    {
      label: "Total Spend",
      value: formatCurrencyCompact(kpis.totalSpend),
      sub: "all time",
      icon: CreditCard,
      accent: "var(--success)",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="p-5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${card.accent} 12%, transparent)` }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.accent }} />
            </div>
          </div>
          <div
            className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {card.value}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">{card.label}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 opacity-60">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   MONTHLY SPEND CHART
   ============================================================ */
function MonthlySpendChart({ data }: { data: DashboardData["monthlySpend"] }) {
  const maxSpend = Math.max(...data.map((d) => d.spend), 1);

  return (
    <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden h-full">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
        <h2
          className="text-base font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Monthly Spend
        </h2>
        <span className="text-xs text-[var(--text-tertiary)]">Last 6 months</span>
      </div>
      <div className="p-6">
        {data.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
            No spend data yet
          </div>
        ) : (
          <div className="flex items-end gap-3" style={{ height: 180 }}>
            {data.map((item) => {
              const pct = (item.spend / maxSpend) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {formatCurrencyCompact(item.spend)}
                  </span>
                  <div className="w-full flex justify-center" style={{ height: 140 }}>
                    <div
                      className="w-full max-w-[48px] rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        background: `linear-gradient(to top, var(--amber-dark), var(--amber))`,
                        alignSelf: "flex-end",
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   QUICK ACTIONS
   ============================================================ */
function QuickActions({ kpis }: { kpis: DashboardData["kpis"] }) {
  return (
    <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-[var(--border-subtle)]">
        <h2
          className="text-base font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Quick Actions
        </h2>
      </div>

      <div className="p-4 space-y-3 flex-1">
        {/* Create RFQ */}
        <Link
          href="/dashboard/rfq/new"
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Create RFQ
        </Link>

        {/* Browse Marketplace */}
        <Link
          href="/marketplace"
          className="btn-outline w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold"
        >
          <Store className="w-4 h-4" />
          Browse Marketplace
        </Link>

        {/* View Messages */}
        <Link
          href="/dashboard/messages"
          className="btn-outline w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold relative"
        >
          <MessageSquare className="w-4 h-4" />
          View Messages
          {kpis.unreadMessages > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold text-white bg-[var(--terracotta)] rounded-full">
              {kpis.unreadMessages}
            </span>
          )}
        </Link>

        {/* Mini stats */}
        <div className="pt-3 mt-auto border-t border-[var(--border-subtle)] space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--terracotta)]" />
              Unread Messages
            </span>
            <span className="font-semibold text-[var(--text-primary)]">{kpis.unreadMessages}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <FileText className="w-3.5 h-3.5 text-[var(--indigo)]" />
              Active RFQs
            </span>
            <span className="font-semibold text-[var(--text-primary)]">{kpis.activeRfqs}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Bell className="w-3.5 h-3.5 text-[var(--amber-dark)]" />
              Notifications
            </span>
            <span className="font-semibold text-[var(--text-primary)]">{kpis.unreadNotifications}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RECENT ORDERS TABLE
   ============================================================ */
function RecentOrders({ orders }: { orders: DashboardData["recentOrders"] }) {
  return (
    <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
        <h2
          className="text-base font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent Orders
        </h2>
        <Link
          href="/dashboard/orders"
          className="text-xs font-semibold text-[var(--amber-dark)] hover:text-[var(--amber)] transition-colors flex items-center gap-1"
        >
          View all orders
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 text-center">
          <ShoppingCart className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--text-tertiary)]">No orders yet</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-60">
            Your recent orders will appear here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-secondary)]">
                {["Order", "Total", "Suppliers", "Status", "Created"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-secondary)]/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-[var(--obsidian)] font-mono">
                      {order.orderNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="text-sm font-semibold text-[var(--obsidian)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {formatCurrency(order.total, order.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[var(--text-secondary)]">
                      from {order.supplierCount} supplier{order.supplierCount !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} map={ORDER_STATUS_MAP} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[var(--text-tertiary)]">
                      {timeAgo(order.createdAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RECENT RFQS
   ============================================================ */
function RecentRfqs({ rfqs }: { rfqs: DashboardData["recentRfqs"] }) {
  return (
    <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
        <h2
          className="text-base font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent RFQs
        </h2>
        <Link
          href="/dashboard/rfq"
          className="text-xs font-semibold text-[var(--amber-dark)] hover:text-[var(--amber)] transition-colors flex items-center gap-1"
        >
          View all RFQs
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {rfqs.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--text-tertiary)]">No RFQs yet</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-60">
            Create your first request for quotation
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {rfqs.map((rfq) => (
            <Link
              key={rfq.id}
              href={`/dashboard/rfq/${rfq.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--indigo) 8%, transparent)" }}
              >
                <FileText className="w-4 h-4 text-[var(--indigo)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {rfq.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-tertiary)] font-mono">{rfq.rfq_number}</span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <StatusBadge status={rfq.status} map={RFQ_STATUS_MAP} />
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="text-sm font-semibold text-[var(--indigo)]">
                  {rfq.quotation_count} quote{rfq.quotation_count !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                  <Clock className="w-3 h-3" />
                  {deadlineCountdown(rfq.deadline)}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buyer/dashboard");
      if (!res.ok) {
        throw new Error(`Failed to load dashboard (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--amber)" }}
        />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-[var(--danger)]" />
        <p className="text-sm text-[var(--text-secondary)]">{error ?? "Failed to load dashboard"}</p>
        <button
          onClick={fetchDashboard}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  /* ---------- Dashboard ---------- */
  const { buyer, kpis, recentOrders, recentRfqs, monthlySpend } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Welcome back, {buyer.name}
          {buyer.companyName && (
            <span className="text-[var(--text-tertiary)]"> — {buyer.companyName}</span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={kpis} />

      {/* Spend Chart + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlySpendChart data={monthlySpend} />
        </div>
        <div>
          <QuickActions kpis={kpis} />
        </div>
      </div>

      {/* Recent Orders + Recent RFQs */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentOrders orders={recentOrders} />
        </div>
        <div>
          <RecentRfqs rfqs={recentRfqs} />
        </div>
      </div>
    </div>
  );
}
