"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Loader2,
  Factory,
  ShieldCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";

// Mock data — will be wired to real DB queries
const ORDER = {
  id: "so-001",
  orderNumber: "SR-20260412-001",
  buyer: "Guangzhou Trading Co.",
  status: "paid",
  date: "2026-04-12",
  total: 324000,
  currency: "USD",
  items: [
    {
      name: "Premium Shea Butter - Raw Unrefined",
      quantity: 500,
      unitPrice: 1850,
      total: 925000,
    },
    {
      name: "Organic Cocoa Beans - Grade A",
      quantity: 200,
      unitPrice: 4200,
      total: 840000,
    },
  ],
  shippingAddress: {
    line1: "88 Huangpu East Road",
    city: "Guangzhou",
    state: "Guangdong",
    country: "CN",
    postalCode: "510000",
  },
};

const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: typeof CheckCircle2 }> = {
  paid: { next: "confirmed", label: "Confirm Order", icon: CheckCircle2 },
  confirmed: { next: "in_production", label: "Start Production", icon: Factory },
  in_production: { next: "quality_check", label: "Quality Check", icon: ShieldCheck },
  quality_check: { next: "ready_to_ship", label: "Ready to Ship", icon: Package },
  ready_to_ship: { next: "dispatched", label: "Mark Dispatched", icon: Send },
  dispatched: { next: "in_transit", label: "Mark In Transit", icon: Truck },
};

const STATUS_TIMELINE = [
  { key: "paid", label: "Payment Received", icon: CheckCircle2 },
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "in_production", label: "In Production", icon: Factory },
  { key: "quality_check", label: "Quality Check", icon: ShieldCheck },
  { key: "ready_to_ship", label: "Ready to Ship", icon: Package },
  { key: "dispatched", label: "Dispatched", icon: Send },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function SupplierOrderDetailPage() {
  const [status, setStatus] = useState(ORDER.status);
  const [loading, setLoading] = useState(false);

  const action = STATUS_ACTIONS[status];

  async function handleAdvanceStatus() {
    if (!action) return;
    setLoading(true);
    // In real implementation, call updateSupplierOrderStatus server action
    await new Promise((r) => setTimeout(r, 800));
    setStatus(action.next);
    setLoading(false);
    toast.success(`Order updated to: ${action.next.replace(/_/g, " ")}`);
  }

  const currentIndex = STATUS_TIMELINE.findIndex((s) => s.key === status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/orders"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div className="flex-1">
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {ORDER.orderNumber}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {ORDER.buyer} · {ORDER.date}
          </p>
        </div>
        {action && (
          <Button onClick={handleAdvanceStatus} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <action.icon className="w-4 h-4" />
            )}
            {action.label}
          </Button>
        )}
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STATUS_TIMELINE.map((step, i) => {
              const isCompleted = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={step.key} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? "bg-[var(--success)] text-white"
                        : "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]"
                    } ${isCurrent ? "ring-2 ring-[var(--success)]/30" : ""}`}
                  >
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCompleted
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {i < STATUS_TIMELINE.length - 1 && (
                    <div
                      className={`w-8 h-0.5 ${
                        i < currentIndex
                          ? "bg-[var(--success)]"
                          : "bg-[var(--border-default)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ORDER.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)]"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {item.quantity} units ×{" "}
                        {formatPrice(item.unitPrice, ORDER.currency)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPrice(item.total, ORDER.currency)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <span className="text-sm font-semibold">Total</span>
                  <span
                    className="text-lg font-bold text-[var(--obsidian)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatPrice(ORDER.total, ORDER.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{ORDER.buyer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-secondary)]">
                {ORDER.shippingAddress.line1}
                <br />
                {ORDER.shippingAddress.city}, {ORDER.shippingAddress.state}
                <br />
                {ORDER.shippingAddress.country}{" "}
                {ORDER.shippingAddress.postalCode}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
