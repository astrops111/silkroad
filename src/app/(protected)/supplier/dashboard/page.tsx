"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Star,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  Loader2,
  BarChart3,
  RefreshCw,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DashboardData {
  company: {
    id: string;
    name: string;
    countryCode: string;
    verificationStatus: string;
    tier: string;
  };
  kpis: {
    totalRevenue: number;
    revenueChange: number;
    pendingOrders: number;
    ordersThisWeek: number;
    activeProducts: number;
    pendingProducts: number;
    averageRating: number;
    responseRate: number;
    onTimeDeliveryRate: number;
    totalOrders: number;
    unreadMessages: number;
    openRfqs: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    buyerName: string;
    buyerCountry: string | null;
    total: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
  topProducts: {
    name: string;
    orders: number;
    revenue: number;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
}

const COUNTRY_FLAGS: Record<string, string> = {
  GH: "\uD83C\uDDEC\uD83C\uDDED", NG: "\uD83C\uDDF3\uD83C\uDDEC", KE: "\uD83C\uDDF0\uD83C\uDDEA",
  UG: "\uD83C\uDDFA\uD83C\uDDEC", TZ: "\uD83C\uDDF9\uD83C\uDDFF", RW: "\uD83C\uDDF7\uD83C\uDDFC",
  ET: "\uD83C\uDDEA\uD83C\uDDF9", ZA: "\uD83C\uDDFF\uD83C\uDDE6", CN: "\uD83C\uDDE8\uD83C\uDDF3",
  EG: "\uD83C\uDDEA\uD83C\uDDEC", CM: "\uD83C\uDDE8\uD83C\uDDF2", SN: "\uD83C\uDDF8\uD83C\uDDF3",
};

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending_payment: { label: "Awaiting Payment", color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock },
  paid: { label: "Paid", color: "var(--amber-dark)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)", icon: DollarSign },
  confirmed: { label: "Confirmed", color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: CheckCircle2 },
  in_production: { label: "In Production", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Zap },
  ready_to_ship: { label: "Ready to Ship", color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Package },
  shipped: { label: "Shipped", color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Truck },
  delivered: { label: "Delivered", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  completed: { label: "Completed", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock };
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full"
      style={{ color: config.color, background: config.bg }}
    >
      <config.icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SupplierDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/supplier/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--amber)" }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--danger)" }}>{error || "Something went wrong"}</p>
          <button onClick={fetchDashboard} className="btn-outline mt-4 !py-2 !px-4 !text-sm">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { company, kpis, recentOrders, topProducts, monthlyRevenue } = data;
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Supplier Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="mt-1">
            Welcome back, {company.name}.
            {company.tier !== "free" && (
              <span
                className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full"
                style={{
                  color: "var(--amber-dark)",
                  background: "color-mix(in srgb, var(--amber) 12%, transparent)",
                }}
              >
                {company.tier.charAt(0).toUpperCase() + company.tier.slice(1)} Supplier
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchDashboard} className="btn-outline !py-2 !px-3 !text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(kpis.totalRevenue),
            change: kpis.revenueChange !== 0 ? `${kpis.revenueChange > 0 ? "+" : ""}${kpis.revenueChange}%` : "—",
            positive: kpis.revenueChange >= 0,
            icon: DollarSign,
            color: "var(--amber)",
          },
          {
            label: "Pending Orders",
            value: kpis.pendingOrders.toString(),
            change: `${kpis.ordersThisWeek} this week`,
            positive: true,
            icon: ShoppingCart,
            color: "var(--terracotta)",
          },
          {
            label: "Active Products",
            value: kpis.activeProducts.toString(),
            change: kpis.pendingProducts > 0 ? `${kpis.pendingProducts} pending review` : "All approved",
            positive: kpis.pendingProducts === 0,
            icon: Package,
            color: "var(--indigo-light)",
          },
          {
            label: "Avg Rating",
            value: kpis.averageRating > 0 ? kpis.averageRating.toFixed(1) : "—",
            change: kpis.onTimeDeliveryRate > 0 ? `${kpis.onTimeDeliveryRate}% on-time` : "No deliveries yet",
            positive: kpis.onTimeDeliveryRate >= 90,
            icon: Star,
            color: "var(--success)",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-5 rounded-2xl border transition-all hover:shadow-md"
            style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${kpi.color} 12%, transparent)` }}
              >
                <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium`} style={{ color: kpi.positive ? "var(--success)" : "var(--text-tertiary)" }}>
                {kpi.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div
          className="lg:col-span-2 p-6 rounded-2xl border"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                Revenue Trend
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Last 6 months</p>
            </div>
            <BarChart3 className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-3 h-40">
            {monthlyRevenue.map((m) => {
              const height = maxMonthlyRevenue > 0 ? (m.revenue / maxMonthlyRevenue) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                    {m.revenue > 0 ? formatCurrency(m.revenue) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      background: m.revenue > 0
                        ? "linear-gradient(to top, var(--amber-dark), var(--amber))"
                        : "var(--surface-secondary)",
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                    {m.month.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions + Stats */}
        <div
          className="p-6 rounded-2xl border"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Quick Actions
          </h2>
          <div className="mt-4 space-y-3">
            <Link href="/supplier/products" className="btn-primary w-full justify-center">
              <Plus className="w-4 h-4" /> Add Product
            </Link>
            <Link href="/supplier/orders" className="btn-outline w-full justify-center">
              <Eye className="w-4 h-4" /> View Orders
            </Link>
            <Link href="/supplier/rfq" className="btn-outline w-full justify-center">
              <FileText className="w-4 h-4" /> Browse RFQs
              {kpis.openRfqs > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ background: "var(--amber)", color: "var(--obsidian)" }}>
                  {kpis.openRfqs}
                </span>
              )}
            </Link>
          </div>

          <div className="mt-6 pt-5 space-y-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-tertiary)" }}>Orders this week</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{kpis.ordersThisWeek}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-tertiary)" }}>Products pending review</span>
              <span className="font-semibold" style={{ color: kpis.pendingProducts > 0 ? "var(--amber-dark)" : "var(--text-primary)" }}>
                {kpis.pendingProducts}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-tertiary)" }}>Unread messages</span>
              <span className="font-semibold" style={{ color: kpis.unreadMessages > 0 ? "var(--terracotta)" : "var(--text-primary)" }}>
                {kpis.unreadMessages}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-tertiary)" }}>Response rate</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {kpis.responseRate > 0 ? `${kpis.responseRate}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div
          className="lg:col-span-2 rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Recent Orders
            </h2>
            <Link
              href="/supplier/orders"
              className="text-sm font-medium flex items-center gap-1 transition-colors"
              style={{ color: "var(--amber-dark)" }}
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No orders yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Orders will appear here when buyers purchase your products</p>
            </div>
          ) : (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Order", "Buyer", "Total", "Status", "Time"].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="py-3 px-2 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-2" style={{ color: "var(--text-primary)" }}>
                        <div className="flex items-center gap-1.5">
                          {order.buyerCountry && (
                            <span className="text-xs">{COUNTRY_FLAGS[order.buyerCountry] || ""}</span>
                          )}
                          <span className="truncate max-w-[160px]">{order.buyerName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {timeAgo(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Top Products
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>By revenue</p>

          {topProducts.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No sales data yet</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {topProducts.map((product, idx) => {
                const maxRev = topProducts[0]?.revenue || 1;
                const widthPct = (product.revenue / maxRev) * 100;
                return (
                  <div key={product.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="truncate max-w-[180px] font-medium" style={{ color: "var(--text-primary)" }}>
                        {idx + 1}. {product.name}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "var(--amber-dark)" }}>
                        {formatCurrency(product.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--surface-secondary)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${widthPct}%`,
                          background: idx === 0 ? "var(--amber)" : idx === 1 ? "var(--amber-dark)" : "var(--border-strong)",
                        }}
                      />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {product.orders} units sold
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
