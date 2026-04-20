"use client";

import { useState, useCallback } from "react";
import {
  Route,
  Truck,
  MapPin,
  Clock,
  Fuel,
  Weight,
  Package,
  Users,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BarChart3,
  Navigation,
  Box,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RouteStop {
  order: number;
  shipment_id: string;
  shipment_number: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  type: "pickup" | "delivery";
  estimated_arrival: string | null;
  service_time_min: number;
}

interface OptimizedRoute {
  route_name: string;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  driver_name: string | null;
  vehicle_reg: string | null;
  vehicle_type: string | null;
  stops: RouteStop[];
  total_distance_km: number;
  total_duration_min: number;
  total_weight_kg: number;
  total_volume_cbm: number;
  vehicle_weight_utilization_pct: number;
  vehicle_volume_utilization_pct: number;
  estimated_fuel_liters: number;
  estimated_fuel_cost: number;
  shipment_count: number;
  shipment_ids: string[];
}

interface UnassignedShipment {
  id: string;
  shipment_number: string;
  delivery_city: string;
  delivery_country: string;
}

interface OptimizationResult {
  run_id?: string;
  routes: OptimizedRoute[];
  unassigned_shipments: UnassignedShipment[];
  total_distance_km: number;
  total_duration_min: number;
  estimated_fuel_cost: number;
  avg_vehicle_utilization_pct: number;
  optimization_notes: string;
  persisted?: boolean;
}

type Strategy =
  | "balanced"
  | "minimize_distance"
  | "minimize_time"
  | "minimize_fuel"
  | "maximize_capacity";

/* ------------------------------------------------------------------ */
/*  Mock warehouses (in production these come from DB)                 */
/* ------------------------------------------------------------------ */
const WAREHOUSES = [
  { id: "wh-nairobi", name: "Nairobi Hub", city: "Nairobi", country: "KE" },
  { id: "wh-lagos", name: "Lagos Apapa Depot", city: "Lagos", country: "NG" },
  { id: "wh-kampala", name: "Kampala Depot", city: "Kampala", country: "UG" },
  { id: "wh-addis", name: "Addis Ababa Warehouse", city: "Addis Ababa", country: "ET" },
  { id: "wh-guangzhou", name: "Guangzhou Port", city: "Guangzhou", country: "CN" },
  { id: "wh-kigali", name: "Kigali Warehouse", city: "Kigali", country: "RW" },
  { id: "wh-dar", name: "Dar es Salaam Hub", city: "Dar es Salaam", country: "TZ" },
  { id: "wh-accra", name: "Accra Central Depot", city: "Accra", country: "GH" },
];

const STRATEGIES: { value: Strategy; label: string; description: string }[] = [
  { value: "balanced", label: "Balanced", description: "Optimize for overall efficiency" },
  { value: "minimize_distance", label: "Shortest Distance", description: "Minimize total kilometers driven" },
  { value: "minimize_time", label: "Fastest Delivery", description: "Minimize total delivery time" },
  { value: "minimize_fuel", label: "Fuel Efficient", description: "Minimize fuel consumption & cost" },
  { value: "maximize_capacity", label: "Max Capacity", description: "Pack vehicles to maximum capacity" },
];

const VEHICLE_ICONS: Record<string, string> = {
  motorcycle: "🏍️",
  van: "🚐",
  truck_small: "🚛",
  truck_large: "🚚",
  container: "📦",
  refrigerated: "❄️",
};

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatCost(minorUnits: number): string {
  return `$${(minorUnits / 100).toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function RouteOptimizationPage() {
  const [warehouseId, setWarehouseId] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<number | null>(null);

  const runOptimization = useCallback(async () => {
    if (!warehouseId) {
      setError("Please select a warehouse");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/logistics/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          strategy,
          date: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok && data.error) {
        setError(data.error);
        return;
      }

      if (data.routes && data.routes.length === 0 && !data.error) {
        setError("No pending shipments found at this warehouse.");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to connect to optimization service.");
    } finally {
      setLoading(false);
    }
  }, [warehouseId, strategy]);

  const selectedWarehouse = WAREHOUSES.find((w) => w.id === warehouseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Route Optimization
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            AI-powered route planning — minimize distance, fuel, and delivery time
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--indigo) 10%, transparent)",
            color: "var(--indigo)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Powered
        </div>
      </div>

      {/* Configuration Panel */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Optimization Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Warehouse Select */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Origin Warehouse
            </label>
            <div className="relative">
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full appearance-none px-4 py-3 rounded-xl text-sm font-medium pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: warehouseId ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <option value="">Select a warehouse...</option>
                {WAREHOUSES.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.city}, {wh.country})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </div>

          {/* Strategy Select */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
              Optimization Strategy
            </label>
            <div className="relative">
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as Strategy)}
                className="w-full appearance-none px-4 py-3 rounded-xl text-sm font-medium pr-10"
                style={{
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} — {s.description}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </div>
        </div>

        {/* Run Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={runOptimization}
            disabled={loading || !warehouseId}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: loading || !warehouseId ? "var(--surface-tertiary)" : "var(--obsidian)",
              color: loading || !warehouseId ? "var(--text-tertiary)" : "var(--ivory)",
              cursor: loading || !warehouseId ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {loading ? "Optimizing Routes..." : "Run Optimization"}
          </button>

          {selectedWarehouse && (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Analyzing pending shipments at {selectedWarehouse.name}
            </span>
          )}
        </div>

        {error && (
          <div
            className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "color-mix(in srgb, var(--danger) 8%, transparent)",
              color: "var(--danger)",
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Routes Created",
                value: result.routes.length.toString(),
                icon: Route,
                accent: "var(--indigo)",
              },
              {
                label: "Total Distance",
                value: `${Math.round(result.total_distance_km)} km`,
                icon: Navigation,
                accent: "var(--terracotta)",
              },
              {
                label: "Est. Duration",
                value: formatDuration(result.total_duration_min),
                icon: Clock,
                accent: "var(--amber)",
              },
              {
                label: "Fuel Cost",
                value: formatCost(result.estimated_fuel_cost),
                icon: Fuel,
                accent: "var(--success)",
              },
              {
                label: "Avg Utilization",
                value: `${Math.round(result.avg_vehicle_utilization_pct)}%`,
                icon: BarChart3,
                accent: "var(--info)",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="p-5 rounded-2xl border"
                style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `color-mix(in srgb, ${kpi.accent} 12%, transparent)` }}
                >
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
                </div>
                <p
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  {kpi.value}
                </p>
                <p className="mt-0.5 text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {kpi.label}
                </p>
              </div>
            ))}
          </div>

          {/* Optimization Notes */}
          {result.optimization_notes && (
            <div
              className="flex items-start gap-3 px-5 py-4 rounded-xl"
              style={{
                background: "color-mix(in srgb, var(--indigo) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--indigo) 15%, transparent)",
              }}
            >
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--indigo)" }} />
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {result.optimization_notes}
              </p>
            </div>
          )}

          {/* Route Cards */}
          <div className="space-y-4">
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              Optimized Routes
            </h2>

            {result.routes.map((route, idx) => {
              const isExpanded = expandedRoute === idx;
              const utilizationColor =
                route.vehicle_weight_utilization_pct > 85
                  ? "var(--success)"
                  : route.vehicle_weight_utilization_pct > 50
                    ? "var(--amber)"
                    : "var(--text-tertiary)";

              return (
                <div
                  key={idx}
                  className="rounded-2xl border overflow-hidden transition-all"
                  style={{
                    background: "var(--surface-primary)",
                    borderColor: isExpanded ? "var(--border-default)" : "var(--border-subtle)",
                    boxShadow: isExpanded ? "var(--shadow-md)" : "none",
                  }}
                >
                  {/* Route header */}
                  <button
                    onClick={() => setExpandedRoute(isExpanded ? null : idx)}
                    className="w-full flex items-center gap-4 p-5 text-left transition-colors"
                    style={{ background: isExpanded ? "var(--surface-secondary)" : "transparent" }}
                  >
                    {/* Route letter badge */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                      style={{
                        background: `color-mix(in srgb, var(--indigo) 12%, transparent)`,
                        color: "var(--indigo)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {route.route_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {route.driver_name && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                            <Users className="w-3 h-3" />
                            {route.driver_name}
                          </span>
                        )}
                        {route.vehicle_reg && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                            <Truck className="w-3 h-3" />
                            {route.vehicle_type && VEHICLE_ICONS[route.vehicle_type]}{" "}
                            {route.vehicle_reg}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="hidden sm:flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {route.shipment_count} stops
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {Math.round(route.total_distance_km)} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          {formatDuration(route.total_duration_min)}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          {formatCost(route.estimated_fuel_cost)} fuel
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: utilizationColor }}>
                          {Math.round(route.vehicle_weight_utilization_pct)}%
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                          utilization
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 shrink-0 transition-transform"
                      style={{
                        color: "var(--text-tertiary)",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {/* Route metrics bar */}
                      <div
                        className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5"
                        style={{ background: "var(--surface-secondary)" }}
                      >
                        <div className="flex items-center gap-3">
                          <Weight className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                              {route.total_weight_kg.toFixed(1)} kg
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              Total weight
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Box className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                              {route.total_volume_cbm.toFixed(2)} m³
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              Total volume
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Fuel className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                              {route.estimated_fuel_liters.toFixed(1)} L
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              Fuel estimate
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-4 h-4" style={{ color: utilizationColor }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: utilizationColor }}>
                              {Math.round(route.vehicle_weight_utilization_pct)}% / {Math.round(route.vehicle_volume_utilization_pct)}%
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              Weight / Volume util.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stops timeline */}
                      <div className="p-5">
                        <p className="text-xs font-semibold mb-4" style={{ color: "var(--text-tertiary)" }}>
                          DELIVERY SEQUENCE
                        </p>

                        <div className="space-y-0">
                          {/* Depot start */}
                          <div className="flex items-center gap-3 pb-3">
                            <div className="relative flex flex-col items-center">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ background: "var(--obsidian)" }}
                              >
                                <MapPin className="w-3.5 h-3.5" style={{ color: "var(--amber)" }} />
                              </div>
                              <div
                                className="w-px flex-1 min-h-[16px]"
                                style={{ background: "var(--border-default)" }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                {selectedWarehouse?.name || "Warehouse"}
                              </p>
                              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                Departure — 07:00
                              </p>
                            </div>
                          </div>

                          {/* Stops */}
                          {route.stops.map((stop, si) => {
                            const isLast = si === route.stops.length - 1;
                            const arrival = stop.estimated_arrival
                              ? new Date(stop.estimated_arrival).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : "--:--";

                            return (
                              <div key={si} className="flex items-start gap-3 pb-3">
                                <div className="relative flex flex-col items-center">
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                                    style={{
                                      background: "color-mix(in srgb, var(--terracotta) 12%, transparent)",
                                      color: "var(--terracotta)",
                                    }}
                                  >
                                    {stop.order}
                                  </div>
                                  {!isLast && (
                                    <div
                                      className="w-px flex-1 min-h-[16px]"
                                      style={{ background: "var(--border-default)" }}
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                      {stop.address}
                                    </p>
                                    <span
                                      className="text-xs font-mono shrink-0"
                                      style={{ color: "var(--text-tertiary)" }}
                                    >
                                      ETA {arrival}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                      {stop.shipment_number}
                                    </span>
                                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                                      •
                                    </span>
                                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                      ~{stop.service_time_min}min service
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Return to depot */}
                          <div className="flex items-center gap-3 pt-1">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: "var(--obsidian)" }}
                            >
                              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--amber)" }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                                Return to {selectedWarehouse?.name || "Warehouse"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center justify-end gap-3 p-5"
                        style={{ borderTop: "1px solid var(--border-subtle)" }}
                      >
                        <button
                          className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Reject Route
                        </button>
                        <button
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                          style={{
                            background: "var(--obsidian)",
                            color: "var(--ivory)",
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept & Dispatch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Unassigned shipments */}
          {result.unassigned_shipments.length > 0 && (
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "color-mix(in srgb, var(--warning) 4%, var(--surface-primary))",
                borderColor: "color-mix(in srgb, var(--warning) 20%, transparent)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: "var(--warning)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {result.unassigned_shipments.length} Unassigned Shipment(s)
                </h3>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
                These shipments could not be routed — missing GPS data or no vehicle capacity available.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.unassigned_shipments.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Package className="w-3 h-3" />
                    {s.shipment_number} — {s.delivery_city || "Unknown"}, {s.delivery_country || "??"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "color-mix(in srgb, var(--indigo) 10%, transparent)" }}
          >
            <Route className="w-8 h-8" style={{ color: "var(--indigo)" }} />
          </div>
          <h3
            className="text-lg font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Optimize Your Fleet Routes
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-tertiary)" }}>
            Select a warehouse and strategy above, then run the optimizer.
            The AI will cluster shipments by proximity, solve for shortest paths,
            and assign the best-fit vehicles and drivers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
            {[
              {
                icon: MapPin,
                title: "Smart Clustering",
                desc: "Groups nearby deliveries using sweep-angle algorithms",
              },
              {
                icon: Navigation,
                title: "Path Optimization",
                desc: "2-opt TSP solver minimizes total travel distance",
              },
              {
                icon: Truck,
                title: "Vehicle Matching",
                desc: "Assigns vehicles by capacity, fuel efficiency, and cargo type",
              },
            ].map((f) => (
              <div key={f.title} className="p-4 rounded-xl" style={{ background: "var(--surface-secondary)" }}>
                <f.icon className="w-5 h-5 mb-2" style={{ color: "var(--amber)" }} />
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
