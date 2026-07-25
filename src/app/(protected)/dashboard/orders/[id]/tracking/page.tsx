"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Navigation,
  Loader2,
} from "lucide-react";
import { getShipmentBySupplierOrderId } from "@/lib/queries/shipments";
import { listShipmentTrackingEvents } from "@/lib/actions/tracking";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/database.types";

type Shipment = Tables<"b2b_shipments">;
type TrackingEvent = Tables<"shipment_tracking_events">;

interface SupplierOrderOption {
  id: string;
  order_number: string;
  companies: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: "text-[var(--text-tertiary)]", icon: Clock },
  assigned: { color: "text-[var(--text-tertiary)]", icon: Clock },
  driver_accepted: { color: "text-[var(--info)]", icon: Package },
  picking: { color: "text-[var(--info)]", icon: Package },
  packed: { color: "text-[var(--info)]", icon: Package },
  dispatched: { color: "text-[var(--indigo)]", icon: Truck },
  in_transit: { color: "text-[var(--amber-dark)]", icon: Navigation },
  at_hub: { color: "text-[var(--terracotta)]", icon: MapPin },
  out_for_delivery: { color: "text-[var(--success)]", icon: Truck },
  delivery_attempted: { color: "text-[var(--warning)]", icon: Truck },
  delivered: { color: "text-[var(--success)]", icon: CheckCircle2 },
  returned: { color: "text-[var(--danger)]", icon: Truck },
  lost: { color: "text-[var(--danger)]", icon: Truck },
  damaged: { color: "text-[var(--danger)]", icon: Truck },
};

function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function locationLabel(loc: unknown): string | null {
  if (!loc || typeof loc !== "object") return null;
  const l = loc as { label?: string; city?: string; country?: string; port?: string };
  const cityCountry = [l.city, l.country].filter(Boolean).join(", ");
  return l.label ?? (cityCountry || l.port || null);
}

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [loadingShipment, setLoadingShipment] = useState(false);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrderOption[]>([]);
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error();
      const { order } = await res.json();
      const options: SupplierOrderOption[] = order.supplier_orders ?? [];
      setSupplierOrders(options);
      if (options.length >= 1) setSupplierOrderId(options[0].id);
    } catch {
      toast.error("Order not found");
      router.push("/dashboard/orders");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useEffect(() => {
    if (!supplierOrderId) return;
    (async () => {
      setLoadingShipment(true);
      const s = await getShipmentBySupplierOrderId(supplierOrderId);
      setShipment(s);
      setEvents(s ? await listShipmentTrackingEvents(s.id) : []);
      setLoadingShipment(false);
    })();
  }, [supplierOrderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  const currentStatus = shipment?.status ?? "pending";
  const statusConfig = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const timeline = [...events].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/orders/${orderId}`}
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
            Shipment Tracking
          </h1>
          {shipment && (
            <p className="text-sm text-[var(--text-tertiary)]">{shipment.shipment_number}</p>
          )}
        </div>
        {shipment && (
          <Badge variant="secondary">
            <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
            {currentStatus.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {supplierOrders.length > 1 && (
        <Select value={supplierOrderId} onValueChange={setSupplierOrderId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a shipment" />
          </SelectTrigger>
          <SelectContent>
            {supplierOrders.map((so) => (
              <SelectItem key={so.id} value={so.id}>
                {so.order_number} — {so.companies?.name ?? "Supplier"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loadingShipment ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
        </div>
      ) : !shipment ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No shipment has been created for this order yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Route summary */}
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--indigo-glow)] flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-5 h-5 text-[var(--indigo)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--obsidian)]">{shipment.pickup_city ?? "—"}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{shipment.pickup_country ?? ""}</p>
                </div>

                <div className="flex-1 mx-6">
                  <div className="h-0.5 bg-gradient-to-r from-[var(--indigo)] via-[var(--amber)] to-[var(--terracotta)] rounded-full" />
                  <p className="text-xs text-[var(--text-tertiary)] text-center mt-2">
                    {shipment.estimated_delivery_at
                      ? `Est. delivery: ${fmtDateTime(shipment.estimated_delivery_at)}`
                      : "Estimated delivery date pending"}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--terracotta-glow)] flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-5 h-5 text-[var(--terracotta)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--obsidian)]">{shipment.delivery_city ?? "—"}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{shipment.delivery_country ?? ""}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tracking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-[var(--text-tertiary)]">No tracking events recorded yet.</p>
                  ) : (
                    <div className="space-y-0">
                      {timeline.map((event, i) => {
                        const isLast = i === timeline.length - 1;
                        const loc = locationLabel(event.location);
                        return (
                          <div key={event.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--success)]/10">
                                <Package className="w-4 h-4 text-[var(--success)]" />
                              </div>
                              {!isLast && (
                                <div className="w-0.5 flex-1 min-h-[32px] bg-[var(--success)]/30" />
                              )}
                            </div>
                            <div className="pb-6">
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {event.description ?? event.event_type.replace(/_/g, " ")}
                              </p>
                              {loc && (
                                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{loc}</p>
                              )}
                              {event.created_at && (
                                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                  {fmtDateTime(event.created_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Shipment details */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Shipment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-tertiary)]">Tracking #</span>
                    <span className="font-medium">{shipment.tracking_number ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-tertiary)]">Method</span>
                    <span className="font-medium capitalize">{shipment.shipping_method.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-tertiary)]">Weight</span>
                    <span className="font-medium">{shipment.total_weight_kg ?? "—"} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-tertiary)]">Packages</span>
                    <span className="font-medium">{shipment.package_count ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-tertiary)]">Dispatched</span>
                    <span className="font-medium">{fmtDateTime(shipment.dispatched_at) ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>

              {shipment.current_location != null && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Current Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[var(--amber)]" />
                      <span className="text-sm font-medium">
                        {locationLabel(shipment.current_location) ?? "Unknown"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
