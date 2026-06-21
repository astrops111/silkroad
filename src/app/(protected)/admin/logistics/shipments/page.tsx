"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Ship,
  Search,
  ChevronDown,
  Eye,
  MoreHorizontal,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Anchor,
  XCircle,
  TrendingUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */
type ShipmentStatus =
  | "booked"
  | "origin_departed"
  | "in_transit"
  | "arrived_destination"
  | "customs_clearance"
  | "out_for_delivery"
  | "delivered"
  | "on_hold";

interface Shipment {
  id: string;
  quoteRef: string;
  buyer: string;
  buyerCountry: string;
  origin: string;
  destination: string;
  carrier: string;
  mode: "LCL" | "FCL 20'" | "FCL 40'" | "Air";
  status: ShipmentStatus;
  eta: string;
  weight: string;
  value: number;
  trackingNumber: string | null;
  hasCustomsHold: boolean;
}

const shipments: Shipment[] = [
  {
    id: "SHP-2026-0092",
    quoteRef: "OQ-2026-0145",
    buyer: "Nairobi Imports Ltd",
    buyerCountry: "🇰🇪",
    origin: "Guangzhou, CN",
    destination: "Mombasa, KE",
    carrier: "COSCO",
    mode: "FCL 40'",
    status: "in_transit",
    eta: "2026-05-08",
    weight: "18,400 kg",
    value: 84200,
    trackingNumber: "COSU6481920743",
    hasCustomsHold: false,
  },
  {
    id: "SHP-2026-0088",
    quoteRef: "OQ-2026-0139",
    buyer: "TechHub Ghana",
    buyerCountry: "🇬🇭",
    origin: "Shenzhen, CN",
    destination: "Tema, GH",
    carrier: "MSC",
    mode: "LCL",
    status: "customs_clearance",
    eta: "2026-04-20",
    weight: "3,200 kg",
    value: 38500,
    trackingNumber: "MSCU7341290012",
    hasCustomsHold: true,
  },
  {
    id: "SHP-2026-0084",
    quoteRef: "OQ-2026-0131",
    buyer: "Cairo Electronics",
    buyerCountry: "🇪🇬",
    origin: "Yiwu, CN",
    destination: "Alexandria, EG",
    carrier: "Evergreen",
    mode: "FCL 20'",
    status: "arrived_destination",
    eta: "2026-04-16",
    weight: "9,700 kg",
    value: 52100,
    trackingNumber: "EGLV1234567890",
    hasCustomsHold: false,
  },
  {
    id: "SHP-2026-0079",
    quoteRef: "OQ-2026-0120",
    buyer: "Kigali Fresh Markets",
    buyerCountry: "🇷🇼",
    origin: "Guangzhou, CN",
    destination: "Kigali (Air), RW",
    carrier: "Ethiopian Airlines",
    mode: "Air",
    status: "delivered",
    eta: "2026-04-05",
    weight: "480 kg",
    value: 14800,
    trackingNumber: "ET-6721093",
    hasCustomsHold: false,
  },
  {
    id: "SHP-2026-0075",
    quoteRef: "OQ-2026-0111",
    buyer: "Dar Trading House",
    buyerCountry: "🇹🇿",
    origin: "Ningbo, CN",
    destination: "Dar es Salaam, TZ",
    carrier: "Hapag-Lloyd",
    mode: "FCL 40'",
    status: "booked",
    eta: "2026-05-22",
    weight: "21,600 kg",
    value: 118000,
    trackingNumber: null,
    hasCustomsHold: false,
  },
  {
    id: "SHP-2026-0071",
    quoteRef: "OQ-2026-0104",
    buyer: "Lagos Distribution Co",
    buyerCountry: "🇳🇬",
    origin: "Shenzhen, CN",
    destination: "Apapa, NG",
    carrier: "Yang Ming",
    mode: "LCL",
    status: "on_hold",
    eta: "2026-04-28",
    weight: "2,800 kg",
    value: 22400,
    trackingNumber: "YMLU3801299042",
    hasCustomsHold: true,
  },
  {
    id: "SHP-2026-0068",
    quoteRef: "OQ-2026-0098",
    buyer: "Addis Trade Partners",
    buyerCountry: "🇪🇹",
    origin: "Guangzhou, CN",
    destination: "Djibouti → Addis",
    carrier: "CMA CGM",
    mode: "FCL 20'",
    status: "origin_departed",
    eta: "2026-05-10",
    weight: "11,200 kg",
    value: 67300,
    trackingNumber: "CMAU9182730041",
    hasCustomsHold: false,
  },
  {
    id: "SHP-2026-0063",
    quoteRef: "OQ-2026-0090",
    buyer: "Kampala Wholesale Group",
    buyerCountry: "🇺🇬",
    origin: "Yiwu, CN",
    destination: "Mombasa → Kampala",
    carrier: "MSC",
    mode: "LCL",
    status: "out_for_delivery",
    eta: "2026-04-17",
    weight: "1,900 kg",
    value: 18700,
    trackingNumber: "MSCU6203741029",
    hasCustomsHold: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const statusConfig: Record<
  ShipmentStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  booked: {
    label: "Booked",
    color: "var(--text-secondary)",
    bg: "var(--surface-secondary)",
    icon: Package,
  },
  origin_departed: {
    label: "Departed Origin",
    color: "var(--indigo)",
    bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",
    icon: Ship,
  },
  in_transit: {
    label: "In Transit",
    color: "var(--indigo)",
    bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",
    icon: Ship,
  },
  arrived_destination: {
    label: "Arrived",
    color: "var(--amber)",
    bg: "color-mix(in srgb, var(--amber) 10%, transparent)",
    icon: Anchor,
  },
  customs_clearance: {
    label: "Customs",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
    icon: AlertTriangle,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    icon: TrendingUp,
  },
  delivered: {
    label: "Delivered",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
    icon: CheckCircle2,
  },
  on_hold: {
    label: "On Hold",
    color: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
    icon: XCircle,
  },
};

const kpis = [
  { label: "Active Shipments", value: "37", icon: Ship, accent: "var(--indigo)" },
  { label: "Delivered (30d)", value: "94", icon: CheckCircle2, accent: "var(--success)" },
  { label: "Customs Holds", value: "3", icon: Anchor, accent: "var(--warning)" },
  { label: "Avg Transit (days)", value: "24", icon: Clock, accent: "var(--amber)" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AdminShipmentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  const filtered = shipments.filter((s) => {
    const matchesSearch =
      !search ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.buyer.toLowerCase().includes(search.toLowerCase()) ||
      s.quoteRef.toLowerCase().includes(search.toLowerCase()) ||
      (s.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesMode = modeFilter === "all" || s.mode === modeFilter;
    return matchesSearch && matchesStatus && matchesMode;
  });

  const holdsCount = filtered.filter((s) => s.hasCustomsHold).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Shipments
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {filtered.length} shipments
            {holdsCount > 0 && (
              <span className="ml-2 font-semibold" style={{ color: "var(--danger)" }}>
                · {holdsCount} customs hold{holdsCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {holdsCount > 0 && (
            <Link
              href="/admin/logistics/customs"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                color: "var(--danger)",
                border: "1px solid color-mix(in srgb, var(--danger) 20%, transparent)",
              }}
            >
              <Anchor className="w-4 h-4" />
              View Customs Queue
            </Link>
          )}
          <button className="btn-outline !py-2 !px-4 !text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
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
            placeholder="Search by shipment ID, buyer, or tracking number..."
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
            <option value="booked">Booked</option>
            <option value="origin_departed">Departed Origin</option>
            <option value="in_transit">In Transit</option>
            <option value="arrived_destination">Arrived</option>
            <option value="customs_clearance">Customs</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="on_hold">On Hold</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>
        <div className="relative">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="all">All Modes</option>
            <option value="LCL">LCL</option>
            <option value="FCL 20'">FCL 20&apos;</option>
            <option value="FCL 40'">FCL 40&apos;</option>
            <option value="Air">Air</option>
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
                {["Shipment", "Buyer", "Route", "Carrier / Mode", "ETA", "Cargo Value", "Status", "Actions"].map((h) => (
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
              {filtered.map((shipment) => {
                const status = statusConfig[shipment.status];
                const StatusIcon = status.icon;
                return (
                  <tr
                    key={shipment.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {shipment.id}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {shipment.quoteRef}
                          </p>
                          {shipment.trackingNumber && (
                            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                              {shipment.trackingNumber}
                            </p>
                          )}
                        </div>
                        {shipment.hasCustomsHold && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                              color: "var(--danger)",
                            }}
                          >
                            HOLD
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {shipment.buyerCountry} {shipment.buyer}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {shipment.origin}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        → {shipment.destination}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {shipment.carrier}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}
                      >
                        {shipment.mode}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {shipment.eta}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {shipment.weight}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        ${shipment.value.toLocaleString()}
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
                          href={`/admin/logistics/shipments/${shipment.id}`}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                          title="View shipment"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {shipment.hasCustomsHold && (
                          <Link
                            href="/admin/logistics/customs"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                              color: "var(--danger)",
                            }}
                          >
                            Customs
                          </Link>
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
            Showing {filtered.length} of {shipments.length} shipments
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
