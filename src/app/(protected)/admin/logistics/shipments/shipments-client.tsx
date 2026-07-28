"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Ship,
  CheckCircle2,
  XCircle,
  Anchor,
  Clock,
  Package,
  TrendingUp,
  AlertTriangle,
  Search,
  Download,
} from "lucide-react";
import type { AdminShipmentListRow } from "@/lib/queries/shipments";

type StatusKey = NonNullable<AdminShipmentListRow["status"]>;

const TERMINAL_STATUSES = new Set<StatusKey>([
  "delivered",
  "returned",
  "lost",
  "damaged",
]);

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  pending: { label: "Pending", color: "var(--text-secondary)", bg: "var(--surface-secondary)", icon: Package },
  assigned: { label: "Assigned", color: "var(--text-secondary)", bg: "var(--surface-secondary)", icon: Package },
  driver_accepted: { label: "Driver Accepted", color: "var(--text-secondary)", bg: "var(--surface-secondary)", icon: Package },
  picking: { label: "Picking", color: "var(--amber)", bg: "color-mix(in srgb, var(--amber) 10%, transparent)", icon: Package },
  packed: { label: "Packed", color: "var(--amber)", bg: "color-mix(in srgb, var(--amber) 10%, transparent)", icon: Package },
  dispatched: { label: "Dispatched", color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: Ship },
  in_transit: { label: "In Transit", color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: Ship },
  at_hub: { label: "At Hub", color: "var(--amber)", bg: "color-mix(in srgb, var(--amber) 10%, transparent)", icon: Anchor },
  out_for_delivery: { label: "Out for Delivery", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: TrendingUp },
  delivery_attempted: { label: "Delivery Attempted", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: AlertTriangle },
  delivered: { label: "Delivered", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  returned: { label: "Returned", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  lost: { label: "Lost", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  damaged: { label: "Damaged", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function routeLabel(s: AdminShipmentListRow): string {
  const from = [s.pickup_city, s.pickup_country].filter(Boolean).join(", ");
  const to = [s.delivery_city, s.delivery_country].filter(Boolean).join(", ");
  if (!from && !to) return "—";
  return `${from || "?"} → ${to || "?"}`;
}

function toCsv(rows: AdminShipmentListRow[]): string {
  const header = [
    "shipment_number", "status", "customs_status", "shipping_method",
    "pickup_city", "pickup_country", "delivery_city", "delivery_country",
    "carrier_scac", "vessel_name", "tracking_number",
    "dispatched_at", "estimated_delivery_at", "delivered_at", "created_at",
  ];
  const lines = rows.map((r) =>
    header
      .map((k) => {
        const v = r[k as keyof AdminShipmentListRow];
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function ShipmentsListClient({
  shipments,
}: {
  shipments: AdminShipmentListRow[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const kpis = useMemo(() => {
    const now = Date.now();
    const d30 = now - 30 * 86_400_000;
    const active = shipments.filter(
      (s) => !s.status || !TERMINAL_STATUSES.has(s.status)
    ).length;
    const delivered30 = shipments.filter(
      (s) => s.delivered_at && new Date(s.delivered_at).getTime() >= d30
    ).length;
    const holds = shipments.filter(
      (s) => s.customs_status === "on_hold" || s.demurrage_flagged_at
    ).length;
    const transits = shipments
      .filter((s) => s.delivered_at && s.dispatched_at)
      .map(
        (s) =>
          (new Date(s.delivered_at!).getTime() -
            new Date(s.dispatched_at!).getTime()) /
          86_400_000
      )
      .filter((d) => d >= 0);
    const avgTransit = transits.length
      ? Math.round(transits.reduce((a, b) => a + b, 0) / transits.length)
      : null;
    return [
      { label: "Active Shipments", value: String(active), icon: Ship, accent: "var(--indigo)" },
      { label: "Delivered (30d)", value: String(delivered30), icon: CheckCircle2, accent: "var(--success)" },
      { label: "Customs Holds", value: String(holds), icon: Anchor, accent: "var(--warning)" },
      { label: "Avg Transit (days)", value: avgTransit == null ? "—" : String(avgTransit), icon: Clock, accent: "var(--amber)" },
    ];
  }, [shipments]);

  const methods = useMemo(
    () =>
      Array.from(
        new Set(shipments.map((s) => s.shipping_method).filter(Boolean))
      ).sort(),
    [shipments]
  );

  const filtered = shipments.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = [
        s.shipment_number,
        s.tracking_number,
        s.carrier_scac,
        s.vessel_name,
        s.pickup_city,
        s.pickup_country,
        s.delivery_city,
        s.delivery_country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (methodFilter !== "all" && s.shipping_method !== methodFilter) return false;
    return true;
  });

  const holdsCount = filtered.filter(
    (s) => s.customs_status === "on_hold" || s.demurrage_flagged_at
  ).length;

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shipments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
            {filtered.length} shipment{filtered.length === 1 ? "" : "s"}
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
          <button onClick={exportCsv} className="btn-outline !py-2 !px-4 !text-sm">
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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}
            >
              <kpi.icon className="w-5 h-5" style={{ color: kpi.accent }} />
            </div>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              {kpi.value}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number / tracking / carrier / city"
            className="pl-9 pr-3 py-2 rounded-xl border text-sm w-80"
            style={{
              background: "var(--surface-primary)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm"
          style={{
            background: "var(--surface-primary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">All statuses</option>
          {Object.entries(statusConfig).map(([value, cfg]) => (
            <option key={value} value={value}>
              {cfg.label}
            </option>
          ))}
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm"
          style={{
            background: "var(--surface-primary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">All methods</option>
          {methods.map((m) => (
            <option key={m} value={m as string}>
              {(m as string).replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-x-auto"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wide"
              style={{ color: "var(--text-tertiary)" }}
            >
              <th className="px-5 py-3 font-medium">Shipment</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Customs</th>
              <th className="px-5 py-3 font-medium">Route</th>
              <th className="px-5 py-3 font-medium">Carrier / Tracking</th>
              <th className="px-5 py-3 font-medium">ETA</th>
              <th className="px-5 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {shipments.length === 0
                    ? "No shipments yet. Shipments appear here once an ops freight quote is converted."
                    : "No shipments match the current filters."}
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const cfg = statusConfig[s.status ?? "pending"] ?? statusConfig.pending;
              const StatusIcon = cfg.icon;
              const hold = s.customs_status === "on_hold" || s.demurrage_flagged_at;
              return (
                <tr
                  key={s.id}
                  className="border-t"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/logistics/shipments/${s.id}`}
                      className="font-semibold hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.shipment_number}
                    </Link>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {(s.shipping_method ?? "").replace(/_/g, " ")}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {hold ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "var(--danger)" }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {s.customs_status === "on_hold" ? "On hold" : "Demurrage"}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {(s.customs_status ?? "—").replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                    {routeLabel(s)}
                  </td>
                  <td className="px-5 py-3">
                    <div style={{ color: "var(--text-secondary)" }}>
                      {[s.carrier_scac, s.vessel_name].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {s.tracking_number ?? ""}
                    </div>
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>
                    {fmtDate(s.estimated_delivery_at)}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--text-tertiary)" }}>
                    {fmtDate(s.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
