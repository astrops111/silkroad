"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
  Truck,
  UserCheck,
  Clock,
  Gavel,
  CreditCard,
  Loader2,
  Package,
} from "lucide-react";

interface DashboardData {
  kpis: { gmv12mo: number; activeSuppliers: number; activeBuyers: number; pendingApprovals: number };
  trend: { month: string; gmv: number; commission: number; payouts: number }[];
  quickLinks: { pendingKyc: number; failedPayments7d: number; activeShipments: number; openDisputes: number };
  recentActivity: { type: "order" | "dispute" | "application"; text: string; detail: string; at: string }[];
}

type ChartTab = "gmv" | "commission" | "payouts";

function fmtVal(cents: number, tab: ChartTab) {
  const v = cents / 100;
  if (tab === "gmv") return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1000).toFixed(0)}k`;
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function RevenueChart({ trend }: { trend: DashboardData["trend"] }) {
  const [activeTab, setActiveTab] = useState<ChartTab>("gmv");
  const maxVal = Math.max(1, ...trend.map((d) => d[activeTab]));
  const accent = activeTab === "gmv" ? "var(--amber)" : activeTab === "commission" ? "var(--indigo)" : "var(--success)";
  const lastVal = trend[trend.length - 1]?.[activeTab] ?? 0;
  const prevVal = trend[trend.length - 2]?.[activeTab] ?? 0;
  const pctChange = prevVal > 0 ? (((lastVal - prevVal) / prevVal) * 100).toFixed(1) : "0.0";

  return (
    <div className="lg:col-span-2 p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Revenue Trend</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Last 12 months</p>
        </div>
        <div className="flex gap-2">
          {(["gmv", "commission", "payouts"] as ChartTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize"
              style={{ background: activeTab === tab ? accent : "var(--surface-secondary)", color: activeTab === tab ? "var(--obsidian)" : "var(--text-tertiary)" }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-0 bottom-6 left-0 flex flex-col justify-between text-right pr-2" style={{ width: 52 }}>
          {[100, 75, 50, 25, 0].map((pct) => (
            <span key={pct} className="text-[10px] leading-none" style={{ color: "var(--text-tertiary)" }}>
              {fmtVal(Math.round((maxVal * pct) / 100), activeTab)}
            </span>
          ))}
        </div>

        <div className="pl-14 pb-6">
          <div className="relative h-52">
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="absolute left-0 right-0 pointer-events-none" style={{ bottom: `${pct}%`, borderTop: "1px dashed var(--border-subtle)" }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-1">
              {trend.map((point) => {
                const h = (point[activeTab] / maxVal) * 100;
                return (
                  <div key={point.month} className="flex-1 flex items-end group relative" style={{ height: "100%" }}>
                    <div className="w-full rounded-t-[3px] transition-all duration-500" style={{ height: `${h}%`, background: accent, opacity: 0.82, minHeight: 3 }} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "var(--obsidian)", color: "var(--ivory)", zIndex: 10 }}>
                      {fmtVal(point[activeTab], activeTab)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-1 mt-1.5">
            {trend.map((point) => (
              <div key={point.month} className="flex-1 text-center">
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{monthLabel(point.month)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmtVal(lastVal, activeTab)}</span> this month
        </p>
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            color: Number(pctChange) >= 0 ? "var(--success)" : "var(--danger)",
            background: Number(pctChange) >= 0 ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--danger) 10%, transparent)",
          }}
        >
          <TrendingUp className="w-3 h-3" />
          {Number(pctChange) >= 0 ? "+" : ""}{pctChange}% vs last month
        </span>
      </div>
    </div>
  );
}

const activityIcon = { order: Package, dispute: Gavel, application: UserCheck } as const;
const activityColor = { order: "var(--amber)", dispute: "var(--danger)", application: "var(--success)" } as const;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const kpis = data
    ? [
        { label: "GMV (12mo)", value: `$${(data.kpis.gmv12mo / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, accent: "var(--amber)" },
        { label: "Active Suppliers", value: data.kpis.activeSuppliers.toLocaleString(), icon: Users, accent: "var(--indigo)" },
        { label: "Active Buyers", value: data.kpis.activeBuyers.toLocaleString(), icon: ShoppingCart, accent: "var(--success)" },
        { label: "Pending Approvals", value: data.kpis.pendingApprovals.toLocaleString(), icon: ClipboardCheck, accent: "var(--warning)" },
      ]
    : [];

  const quickLinks = data
    ? [
        { label: "Pending KYC", href: "/admin/supplier-applications", icon: UserCheck, count: data.quickLinks.pendingKyc, badge: "suppliers", color: "var(--warning)" },
        { label: "Failed Payments", href: "/admin/payments", icon: CreditCard, count: data.quickLinks.failedPayments7d, badge: "past 7d", color: "var(--danger)" },
        { label: "Active Shipments", href: "/admin/logistics/shipments", icon: Truck, count: data.quickLinks.activeShipments, badge: "in transit", color: "var(--indigo)" },
        { label: "Open Disputes", href: "/admin/disputes", icon: ClipboardCheck, count: data.quickLinks.openDisputes, badge: "unresolved", color: "var(--success)" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Platform Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>Real-time overview of Silk Road Africa operations</p>
      </div>

      {!data ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}>
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
                </div>
                <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{kpi.value}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <RevenueChart trend={data.trend} />

            <div className="p-6 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-lg font-bold mb-5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Recent Activity</h2>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nothing yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.recentActivity.map((item, i) => {
                    const Icon = activityIcon[item.type];
                    const color = activityColor[item.type];
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{item.text}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{item.detail}</p>
                          <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                            <Clock className="w-3 h-3" />
                            {timeAgo(item.at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="group flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-md"
                style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${link.color} 12%, transparent)` }}>
                    <link.icon className="w-5 h-5" style={{ color: link.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{link.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{link.count} {link.badge}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: "var(--text-tertiary)" }} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
