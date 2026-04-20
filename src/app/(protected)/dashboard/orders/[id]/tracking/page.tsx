"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Navigation,
} from "lucide-react";

// Mock shipment — will be wired to getShipmentsByOrder()
const SHIPMENT = {
  id: "shp-001",
  shipmentNumber: "SHP-M1234ABC",
  status: "in_transit",
  shippingMethod: "platform_standard",
  trackingNumber: "SRFRT-20260412-001",
  trackingUrl: null,
  pickupCity: "Shenzhen",
  pickupCountry: "CN",
  deliveryCity: "Accra",
  deliveryCountry: "GH",
  totalWeightKg: 245.5,
  packageCount: 12,
  estimatedDelivery: "2026-04-28",
  dispatchedAt: "2026-04-14",
  currentLocation: { label: "Port of Tema, Ghana", lat: 5.6338, lng: -0.0147 },
  timeline: [
    { status: "pending", label: "Order placed", date: "2026-04-12 09:00", done: true },
    { status: "picked_up", label: "Picked up from supplier", date: "2026-04-13 14:30", done: true },
    { status: "dispatched", label: "Dispatched from Shenzhen port", date: "2026-04-14 08:00", done: true },
    { status: "in_transit", label: "In transit — Port of Tema, Ghana", date: "2026-04-22 16:00", done: true },
    { status: "at_hub", label: "Arrived at Accra hub", date: null, done: false },
    { status: "out_for_delivery", label: "Out for delivery", date: null, done: false },
    { status: "delivered", label: "Delivered", date: null, done: false },
  ],
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: "text-[var(--text-tertiary)]", icon: Clock },
  picked_up: { color: "text-[var(--info)]", icon: Package },
  dispatched: { color: "text-[var(--indigo)]", icon: Truck },
  in_transit: { color: "text-[var(--amber-dark)]", icon: Navigation },
  at_hub: { color: "text-[var(--terracotta)]", icon: MapPin },
  out_for_delivery: { color: "text-[var(--success)]", icon: Truck },
  delivered: { color: "text-[var(--success)]", icon: CheckCircle2 },
};

export default function TrackingPage() {
  const params = useParams();
  const orderId = params.id as string;

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
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Shipment Tracking
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {SHIPMENT.shipmentNumber}
          </p>
        </div>
        <Badge variant="secondary">
          <Navigation className="w-3 h-3" />
          {SHIPMENT.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Route summary */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--indigo-glow)] flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-5 h-5 text-[var(--indigo)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--obsidian)]">
                {SHIPMENT.pickupCity}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {SHIPMENT.pickupCountry}
              </p>
            </div>

            <div className="flex-1 mx-6">
              <div className="h-0.5 bg-gradient-to-r from-[var(--indigo)] via-[var(--amber)] to-[var(--terracotta)] rounded-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--amber)] border-2 border-white shadow-md"
                  style={{ left: "65%" }}
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] text-center mt-2">
                Est. delivery: {SHIPMENT.estimatedDelivery}
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--terracotta-glow)] flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-5 h-5 text-[var(--terracotta)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--obsidian)]">
                {SHIPMENT.deliveryCity}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {SHIPMENT.deliveryCountry}
              </p>
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
              <div className="space-y-0">
                {SHIPMENT.timeline.map((event, i) => {
                  const config = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.pending;
                  const isLast = i === SHIPMENT.timeline.length - 1;

                  return (
                    <div key={event.status} className="flex gap-4">
                      {/* Line + dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            event.done
                              ? "bg-[var(--success)]/10"
                              : "bg-[var(--surface-tertiary)]"
                          }`}
                        >
                          <config.icon
                            className={`w-4 h-4 ${
                              event.done ? "text-[var(--success)]" : "text-[var(--text-tertiary)]"
                            }`}
                          />
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[32px] ${
                              event.done ? "bg-[var(--success)]/30" : "bg-[var(--border-default)]"
                            }`}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="pb-6">
                        <p
                          className={`text-sm font-medium ${
                            event.done ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                          }`}
                        >
                          {event.label}
                        </p>
                        {event.date && (
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {event.date}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                <span className="font-medium">{SHIPMENT.trackingNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Method</span>
                <span className="font-medium">Platform Standard</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Weight</span>
                <span className="font-medium">{SHIPMENT.totalWeightKg} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Packages</span>
                <span className="font-medium">{SHIPMENT.packageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Dispatched</span>
                <span className="font-medium">{SHIPMENT.dispatchedAt}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--amber)]" />
                <span className="text-sm font-medium">
                  {SHIPMENT.currentLocation.label}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
