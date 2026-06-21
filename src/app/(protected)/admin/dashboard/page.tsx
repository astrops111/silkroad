"use client";

import Link from "next/link";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
  Truck,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const kpis = [
  {
    label: "Gross Merchandise Value",
    value: "$1.24M",
    change: "+12.3%",
    trend: "up" as const,
    icon: DollarSign,
    accent: "var(--amber)",
  },
  {
    label: "Active Suppliers",
    value: "1,847",
    change: "+5.2%",
    trend: "up" as const,
    icon: Users,
    accent: "var(--indigo)",
  },
  {
    label: "Active Buyers",
    value: "6,230",
    change: "+8.7%",
    trend: "up" as const,
    icon: ShoppingCart,
    accent: "var(--success)",
  },
  {
    label: "Pending Approvals",
    value: "23",
    change: "-3",
    trend: "down" as const,
    icon: ClipboardCheck,
    accent: "var(--warning)",
  },
];

const recentActivity = [
  {
    icon: UserCheck,
    color: "var(--success)",
    text: "New supplier registered",
    detail: "Guangzhou Huawei Electronics Ltd.",
    time: "2 min ago",
  },
  {
    icon: CreditCard,
    color: "var(--amber)",
    text: "Order #ORD-2024-4871 paid",
    detail: "$12,400 via MTN Mobile Money",
    time: "18 min ago",
  },
  {
    icon: Truck,
    color: "var(--indigo)",
    text: "Shipment SHP-0092 delivered",
    detail: "Kampala warehouse confirmed receipt",
    time: "45 min ago",
  },
  {
    icon: AlertCircle,
    color: "var(--danger)",
    text: "Dispute raised on ORD-2024-4820",
    detail: "Quality mismatch reported by buyer",
    time: "1 hr ago",
  },
  {
    icon: CheckCircle2,
    color: "var(--success)",
    text: "Supplier verified",
    detail: "Nairobi Fresh Produce Co-op approved",
    time: "2 hrs ago",
  },
];

/* ------------------------------------------------------------------ */
/*  Chart                                                              */
/* ------------------------------------------------------------------ */
const chartData = {
  GMV: [
    { month: "May", value: 820000 },
    { month: "Jun", value: 910000 },
    { month: "Jul", value: 870000 },
    { month: "Aug", value: 960000 },
    { month: "Sep", value: 1020000 },
    { month: "Oct", value: 980000 },
    { month: "Nov", value: 1100000 },
    { month: "Dec", value: 1280000 },
    { month: "Jan", value: 1050000 },
    { month: "Feb", value: 1140000 },
    { month: "Mar", value: 1200000 },
    { month: "Apr", value: 1240000 },
  ],
  Commission: [
    { month: "May", value: 65600 },
    { month: "Jun", value: 72800 },
    { month: "Jul", value: 69600 },
    { month: "Aug", value: 76800 },
    { month: "Sep", value: 81600 },
    { month: "Oct", value: 78400 },
    { month: "Nov", value: 88000 },
    { month: "Dec", value: 102400 },
    { month: "Jan", value: 84000 },
    { month: "Feb", value: 91200 },
    { month: "Mar", value: 96000 },
    { month: "Apr", value: 99200 },
  ],
  Payouts: [
    { month: "May", value: 59000 },
    { month: "Jun", value: 65500 },
    { month: "Jul", value: 62600 },
    { month: "Aug", value: 69100 },
    { month: "Sep", value: 73400 },
    { month: "Oct", value: 70600 },
    { month: "Nov", value: 79200 },
    { month: "Dec", value: 92100 },
    { month: "Jan", value: 75600 },
    { month: "Feb", value: 82100 },
    { month: "Mar", value: 86400 },
    { month: "Apr", value: 89300 },
  ],
} as const;

type ChartTab = keyof typeof chartData;

function fmtVal(v: number, tab: ChartTab) {
  if (tab === "GMV") return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1000).toFixed(0)}k`;
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
}

function RevenueChart() {
  const [activeTab, setActiveTab] = useState<ChartTab>("GMV");
  const data = chartData[activeTab];
  const maxVal = Math.max(...data.map((d) => d.value));
  const accent =
    activeTab === "GMV" ? "var(--amber)" : activeTab === "Commission" ? "var(--indigo)" : "var(--success)";
  const lastVal = data[data.length - 1].value;
  const prevVal = data[data.length - 2].value;
  const pctChange = (((lastVal - prevVal) / prevVal) * 100).toFixed(1);

  return (
    <div
      className="lg:col-span-2 p-6 rounded-2xl border"
      style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Revenue Trend
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Last 12 months
          </p>
        </div>
        <div className="flex gap-2">
          {(["GMV", "Commission", "Payouts"] as ChartTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: activeTab === tab ? accent : "var(--surface-secondary)",
                color: activeTab === tab ? "var(--obsidian)" : "var(--text-tertiary)",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Bars + grid */}
      <div className="relative">
        {/* Y-axis labels */}
        <div
          className="absolute top-0 bottom-6 left-0 flex flex-col justify-between text-right pr-2"
          style={{ width: 52 }}
        >
          {[100, 75, 50, 25, 0].map((pct) => (
            <span key={pct} className="text-[10px] leading-none" style={{ color: "var(--text-tertiary)" }}>
              {fmtVal(Math.round((maxVal * pct) / 100), activeTab)}
            </span>
          ))}
        </div>

        <div className="pl-14 pb-6">
          {/* Horizontal grid */}
          <div className="relative h-52">
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ bottom: `${pct}%`, borderTop: "1px dashed var(--border-subtle)" }}
              />
            ))}
            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-1">
              {data.map((point) => {
                const h = (point.value / maxVal) * 100;
                return (
                  <div key={point.month} className="flex-1 flex items-end group relative" style={{ height: "100%" }}>
                    <div
                      className="w-full rounded-t-[3px] transition-all duration-500"
                      style={{ height: `${h}%`, background: accent, opacity: 0.82, minHeight: 3 }}
                    />
                    {/* Hover tooltip */}
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: "var(--obsidian)", color: "var(--ivory)", zIndex: 10 }}
                    >
                      {fmtVal(point.value, activeTab)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1 mt-1.5">
            {data.map((point) => (
              <div key={point.month} className="flex-1 text-center">
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {point.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer summary */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {fmtVal(lastVal, activeTab)}
          </span>{" "}
          this month
        </p>
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            color: Number(pctChange) >= 0 ? "var(--success)" : "var(--danger)",
            background:
              Number(pctChange) >= 0
                ? "color-mix(in srgb, var(--success) 10%, transparent)"
                : "color-mix(in srgb, var(--danger) 10%, transparent)",
          }}
        >
          <TrendingUp className="w-3 h-3" />
          {Number(pctChange) >= 0 ? "+" : ""}
          {pctChange}% vs last month
        </span>
      </div>
    </div>
  );
}

const quickLinks = [
  {
    label: "Pending KYC",
    href: "/admin/verification",
    icon: UserCheck,
    count: 23,
    badge: "suppliers",
    color: "var(--warning)",
  },
  {
    label: "Failed Payments",
    href: "/admin/payments",
    icon: CreditCard,
    count: 18,
    badge: "to retry",
    color: "var(--danger)",
  },
  {
    label: "Active Shipments",
    href: "/admin/logistics/shipments",
    icon: Truck,
    count: 37,
    badge: "in transit",
    color: "var(--indigo)",
  },
  {
    label: "Open Disputes",
    href: "/admin/disputes",
    icon: ClipboardCheck,
    count: 3,
    badge: "unresolved",
    color: "var(--success)",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Platform Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Real-time overview of Silk Road Africa operations
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                style={{
                  color: kpi.trend === "up" ? "var(--success)" : "var(--text-tertiary)",
                  background:
                    kpi.trend === "up"
                      ? "color-mix(in srgb, var(--success) 10%, transparent)"
                      : "var(--surface-secondary)",
                }}
              >
                {kpi.trend === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
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

      {/* Revenue Chart + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <RevenueChart />

        {/* Recent Activity */}
        <div
          className="p-6 rounded-2xl border"
          style={{
            background: "var(--surface-primary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <h2
            className="text-lg font-bold mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                  }}
                >
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.text}
                  </p>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {item.detail}
                  </p>
                  <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="group flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-md"
            style={{
              background: "var(--surface-primary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${link.color} 12%, transparent)`,
                }}
              >
                <link.icon className="w-5 h-5" style={{ color: link.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {link.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {link.count} {link.badge}
                </p>
              </div>
            </div>
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              style={{ color: "var(--text-tertiary)" }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
