"use client";

import {
  Truck,
  Package,
  Users,
  Gauge,
  MapPin,
  ArrowRight,
  Clock,
  MoreHorizontal,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */
type ShipmentStatus =
  | "awaiting_pickup"
  | "in_transit"
  | "at_customs"
  | "out_for_delivery"
  | "delivered"
  | "delayed";

interface Shipment {
  id: string;
  shipmentNumber: string;
  routeFrom: string;
  routeTo: string;
  driver: string | null;
  vehicle: string | null;
  status: ShipmentStatus;
  eta: string;
  orderRef: string;
}

const kpis = [
  {
    label: "Active Shipments",
    value: "37",
    icon: Package,
    accent: "var(--indigo)",
  },
  {
    label: "Deliveries Today",
    value: "12",
    icon: Truck,
    accent: "var(--success)",
  },
  {
    label: "Available Drivers",
    value: "8",
    icon: Users,
    accent: "var(--amber)",
  },
  {
    label: "Fleet Utilization",
    value: "74%",
    icon: Gauge,
    accent: "var(--terracotta)",
  },
];

const shipments: Shipment[] = [
  {
    id: "1",
    shipmentNumber: "SHP-2025-0098",
    routeFrom: "Guangzhou Port",
    routeTo: "Mombasa Port",
    driver: "James Ochieng",
    vehicle: "MV Silk Trader",
    status: "in_transit",
    eta: "2025-04-22",
    orderRef: "ORD-2025-4871",
  },
  {
    id: "2",
    shipmentNumber: "SHP-2025-0097",
    routeFrom: "Shenzhen Warehouse",
    routeTo: "Accra Central Depot",
    driver: null,
    vehicle: null,
    status: "awaiting_pickup",
    eta: "2025-04-25",
    orderRef: "ORD-2025-4870",
  },
  {
    id: "3",
    shipmentNumber: "SHP-2025-0096",
    routeFrom: "Kigali Warehouse",
    routeTo: "Shanghai Free Trade Zone",
    driver: "Chen Wei",
    vehicle: "KGL-4521B",
    status: "at_customs",
    eta: "2025-04-19",
    orderRef: "ORD-2025-4869",
  },
  {
    id: "4",
    shipmentNumber: "SHP-2025-0095",
    routeFrom: "Nairobi Hub",
    routeTo: "Dar es Salaam",
    driver: "John Mwangi",
    vehicle: "KAA 234X",
    status: "out_for_delivery",
    eta: "2025-04-17",
    orderRef: "ORD-2025-4868",
  },
  {
    id: "5",
    shipmentNumber: "SHP-2025-0094",
    routeFrom: "Addis Ababa Warehouse",
    routeTo: "Guangzhou Port",
    driver: "Tesfaye Bekele",
    vehicle: "ETH-7812C",
    status: "delayed",
    eta: "2025-04-20",
    orderRef: "ORD-2025-4867",
  },
  {
    id: "6",
    shipmentNumber: "SHP-2025-0093",
    routeFrom: "Dongguan Factory",
    routeTo: "Lagos Apapa Port",
    driver: "Li Ming",
    vehicle: "MV Ocean Pearl",
    status: "in_transit",
    eta: "2025-04-28",
    orderRef: "ORD-2025-4866",
  },
  {
    id: "7",
    shipmentNumber: "SHP-2025-0092",
    routeFrom: "Kampala Depot",
    routeTo: "Kampala Retail Group HQ",
    driver: "Moses Ssekandi",
    vehicle: "UBE 902T",
    status: "delivered",
    eta: "2025-04-16",
    orderRef: "ORD-2025-4860",
  },
];

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const statusConfig: Record<
  ShipmentStatus,
  { label: string; color: string; bg: string }
> = {
  awaiting_pickup: {
    label: "Awaiting Pickup",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
  },
  in_transit: {
    label: "In Transit",
    color: "var(--indigo)",
    bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",
  },
  at_customs: {
    label: "At Customs",
    color: "var(--amber-dark)",
    bg: "color-mix(in srgb, var(--amber) 12%, transparent)",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "var(--info)",
    bg: "color-mix(in srgb, var(--info) 10%, transparent)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
  },
  delayed: {
    label: "Delayed",
    color: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LogisticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Logistics Operations
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Fleet management, shipment tracking, and delivery operations
        </p>
      </div>

      {/* KPI Cards */}
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
            placeholder="Search by shipment number or route..."
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

      {/* Shipments Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {[
                  "Shipment",
                  "Route",
                  "Driver",
                  "Vehicle",
                  "Status",
                  "ETA",
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
              {shipments.map((s) => {
                const status = statusConfig[s.status];

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
                    {/* Shipment number */}
                    <td className="px-5 py-4">
                      <div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {s.shipmentNumber}
                        </span>
                        <br />
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {s.orderRef}
                        </span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--terracotta)" }} />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {s.routeFrom}
                        </span>
                        <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--indigo)" }} />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {s.routeTo}
                        </span>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: s.driver ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
                        {s.driver ?? "Unassigned"}
                      </span>
                    </td>

                    {/* Vehicle */}
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: s.vehicle ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
                        {s.vehicle ?? "---"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {s.status === "delayed" && <AlertTriangle className="w-3 h-3" />}
                        {s.status === "delivered" && <CheckCircle2 className="w-3 h-3" />}
                        {s.status === "in_transit" && <Truck className="w-3 h-3" />}
                        {s.status === "at_customs" && <Clock className="w-3 h-3" />}
                        {status.label}
                      </span>
                    </td>

                    {/* ETA */}
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(s.eta).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {s.status === "awaiting_pickup" && (
                          <>
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{
                                background: "color-mix(in srgb, var(--indigo) 10%, transparent)",
                                color: "var(--indigo)",
                              }}
                            >
                              Assign Driver
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{
                                background: "color-mix(in srgb, var(--success) 12%, transparent)",
                                color: "var(--success)",
                              }}
                            >
                              Dispatch
                            </button>
                          </>
                        )}
                        {s.status === "at_customs" && (
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            style={{
                              background: "color-mix(in srgb, var(--amber) 12%, transparent)",
                              color: "var(--amber-dark)",
                            }}
                          >
                            Update Status
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

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Showing {shipments.length} shipments
          </p>
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
