"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
  Package,
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

const quickLinks = [
  {
    label: "Approve Suppliers",
    href: "/admin/suppliers",
    icon: UserCheck,
    count: 23,
    color: "var(--warning)",
  },
  {
    label: "View Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    count: 148,
    color: "var(--indigo)",
  },
  {
    label: "Manage Logistics",
    href: "/admin/logistics",
    icon: Truck,
    count: 37,
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
        {/* Revenue chart placeholder */}
        <div
          className="lg:col-span-2 p-6 rounded-2xl border"
          style={{
            background: "var(--surface-primary)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
              >
                Revenue Trend
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                Last 12 months
              </p>
            </div>
            <div className="flex gap-2">
              {["GMV", "Commission", "Payouts"].map((tab, i) => (
                <button
                  key={tab}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{
                    background: i === 0 ? "var(--amber)" : "var(--surface-secondary)",
                    color: i === 0 ? "var(--obsidian)" : "var(--text-tertiary)",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Placeholder chart area */}
          <div
            className="flex items-center justify-center rounded-xl h-64"
            style={{
              background: "var(--surface-secondary)",
              border: "2px dashed var(--border-default)",
            }}
          >
            <div className="text-center">
              <TrendingUp
                className="w-10 h-10 mx-auto mb-3 opacity-20"
                style={{ color: "var(--text-tertiary)" }}
              />
              <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                Revenue chart will render here
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Integrate with Recharts or Chart.js
              </p>
            </div>
          </div>
        </div>

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
      <div className="grid sm:grid-cols-3 gap-5">
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
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {link.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {link.count} active
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
