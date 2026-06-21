"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserCircle2,
  Search,
  ChevronDown,
  Eye,
  MoreHorizontal,
  TrendingUp,
  ShoppingCart,
  Users,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */
type BuyerStatus = "active" | "pending_kyc" | "suspended" | "inactive";

interface Buyer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  countryFlag: string;
  city: string;
  totalOrders: number;
  totalGMV: number;
  lastOrderDate: string;
  status: BuyerStatus;
  creditLimit: number | null;
}

const buyers: Buyer[] = [
  {
    id: "BUY-001",
    companyName: "TechHub Ghana",
    contactName: "Kwame Asante",
    email: "kwame@techhubgh.com",
    countryFlag: "🇬🇭",
    city: "Accra",
    totalOrders: 34,
    totalGMV: 142800,
    lastOrderDate: "2026-04-15",
    status: "active",
    creditLimit: 50000,
  },
  {
    id: "BUY-002",
    companyName: "Nairobi Imports Ltd",
    contactName: "Amina Wanjiku",
    email: "amina@nairobiimports.co.ke",
    countryFlag: "🇰🇪",
    city: "Nairobi",
    totalOrders: 71,
    totalGMV: 398500,
    lastOrderDate: "2026-04-14",
    status: "active",
    creditLimit: 120000,
  },
  {
    id: "BUY-003",
    companyName: "Cairo Electronics",
    contactName: "Ahmed Hassan",
    email: "ahmed.h@cairoelectronics.eg",
    countryFlag: "🇪🇬",
    city: "Cairo",
    totalOrders: 18,
    totalGMV: 87200,
    lastOrderDate: "2026-04-10",
    status: "active",
    creditLimit: null,
  },
  {
    id: "BUY-004",
    companyName: "Lagos Distribution Co",
    contactName: "Chidi Okafor",
    email: "chidi@lagosdist.ng",
    countryFlag: "🇳🇬",
    city: "Lagos",
    totalOrders: 0,
    totalGMV: 0,
    lastOrderDate: "—",
    status: "pending_kyc",
    creditLimit: null,
  },
  {
    id: "BUY-005",
    companyName: "Dar Trading House",
    contactName: "Fatuma Mshangama",
    email: "fatuma@dartrading.tz",
    countryFlag: "🇹🇿",
    city: "Dar es Salaam",
    totalOrders: 12,
    totalGMV: 44600,
    lastOrderDate: "2026-03-22",
    status: "active",
    creditLimit: 20000,
  },
  {
    id: "BUY-006",
    companyName: "Kampala Wholesale Group",
    contactName: "Robert Mugisha",
    email: "r.mugisha@kwg.ug",
    countryFlag: "🇺🇬",
    city: "Kampala",
    totalOrders: 8,
    totalGMV: 28900,
    lastOrderDate: "2026-01-30",
    status: "suspended",
    creditLimit: null,
  },
  {
    id: "BUY-007",
    companyName: "Addis Trade Partners",
    contactName: "Tigist Bekele",
    email: "tigist@addistradeEt.com",
    countryFlag: "🇪🇹",
    city: "Addis Ababa",
    totalOrders: 5,
    totalGMV: 19200,
    lastOrderDate: "2026-02-14",
    status: "inactive",
    creditLimit: null,
  },
  {
    id: "BUY-008",
    companyName: "Kigali Fresh Markets",
    contactName: "Jean-Pierre Nkurunziza",
    email: "jp@kigalifresh.rw",
    countryFlag: "🇷🇼",
    city: "Kigali",
    totalOrders: 22,
    totalGMV: 63400,
    lastOrderDate: "2026-04-08",
    status: "active",
    creditLimit: 30000,
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const statusConfig: Record<BuyerStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: {
    label: "Active",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    icon: CheckCircle2,
  },
  pending_kyc: {
    label: "Pending KYC",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    icon: Clock,
  },
  suspended: {
    label: "Suspended",
    color: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
    icon: XCircle,
  },
  inactive: {
    label: "Inactive",
    color: "var(--text-tertiary)",
    bg: "var(--surface-secondary)",
    icon: AlertTriangle,
  },
};

const kpis = [
  { label: "Total Buyers", value: "6,230", change: "+8.7%", icon: Users, accent: "var(--indigo)" },
  { label: "Active This Month", value: "1,842", change: "+4.1%", icon: TrendingUp, accent: "var(--success)" },
  { label: "Orders This Month", value: "4,891", change: "+11.3%", icon: ShoppingCart, accent: "var(--amber)" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminBuyersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = buyers.filter((b) => {
    const matchesSearch =
      !search ||
      b.companyName.toLowerCase().includes(search.toLowerCase()) ||
      b.contactName.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Buyers
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {filtered.length} buyers · manage accounts, credit limits, and KYC status
          </p>
        </div>
        <button className="btn-outline !py-2 !px-4 !text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)" }}
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
            placeholder="Search by name, email, or company..."
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
            <option value="active">Active</option>
            <option value="pending_kyc">Pending KYC</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
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
                {["Buyer", "Contact", "Location", "Orders", "GMV", "Credit Limit", "Last Order", "Status", "Actions"].map((h) => (
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
              {filtered.map((buyer) => {
                const status = statusConfig[buyer.status];
                const StatusIcon = status.icon;
                return (
                  <tr
                    key={buyer.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--indigo) 12%, transparent)", color: "var(--indigo)" }}
                        >
                          <UserCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {buyer.companyName}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {buyer.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{buyer.contactName}</p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{buyer.email}</p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {buyer.countryFlag} {buyer.city}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {buyer.totalOrders}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {buyer.totalGMV > 0 ? `$${buyer.totalGMV.toLocaleString()}` : "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: buyer.creditLimit ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
                        {buyer.creditLimit ? `$${buyer.creditLimit.toLocaleString()}` : "None"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {buyer.lastOrderDate}
                      </span>
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
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/buyers/${buyer.id}`}
                          className="p-1.5 rounded-lg transition-colors inline-flex items-center"
                          style={{ color: "var(--text-tertiary)" }}
                          title="View buyer"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {buyer.status === "pending_kyc" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--warning) 10%, transparent)",
                              color: "var(--warning)",
                            }}
                          >
                            Review KYC
                          </button>
                        )}
                        {buyer.status === "suspended" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--success) 10%, transparent)",
                              color: "var(--success)",
                            }}
                          >
                            Reinstate
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

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Showing {filtered.length} of {buyers.length} buyers
          </p>
          <div className="flex gap-1">
            {[1, 2, 3].map((p) => (
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
