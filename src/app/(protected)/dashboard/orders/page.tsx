"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowUpRight,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock data — will be replaced with real queries in Phase 1 completion
const ORDERS = [
  {
    id: "po-001",
    orderNumber: "PO-2026-1247",
    product: "CNC Laser Cutting Machine 3000W",
    supplier: "HuaNan Precision Machinery",
    amount: 2400000,
    currency: "USD",
    status: "in_transit",
    date: "2026-04-12",
    itemCount: 1,
  },
  {
    id: "po-002",
    orderNumber: "PO-2026-1245",
    product: "Solar Panel 550W x 200 Units",
    supplier: "SunPower Energy Tech",
    amount: 2240000,
    currency: "USD",
    status: "in_production",
    date: "2026-04-10",
    itemCount: 200,
  },
  {
    id: "po-003",
    orderNumber: "PO-2026-1240",
    product: "LED Street Light 200W x 500",
    supplier: "BrightPath Lighting",
    amount: 2850000,
    currency: "USD",
    status: "delivered",
    date: "2026-04-03",
    itemCount: 500,
  },
  {
    id: "po-004",
    orderNumber: "PO-2026-1238",
    product: "Organic Cotton T-Shirts x 2000",
    supplier: "Silk Valley Textiles",
    amount: 560000,
    currency: "USD",
    status: "pending_payment",
    date: "2026-04-01",
    itemCount: 2000,
  },
  {
    id: "po-005",
    orderNumber: "PO-2026-1235",
    product: "Rice Milling Machine 2TPH",
    supplier: "AgroTech Equipment",
    amount: 920000,
    currency: "USD",
    status: "completed",
    date: "2026-03-28",
    itemCount: 1,
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  pending_payment: { label: "Payment Due", variant: "destructive", icon: AlertCircle },
  paid: { label: "Paid", variant: "default", icon: CheckCircle2 },
  confirmed: { label: "Confirmed", variant: "secondary", icon: CheckCircle2 },
  in_production: { label: "In Production", variant: "secondary", icon: Clock },
  in_transit: { label: "In Transit", variant: "outline", icon: Truck },
  delivered: { label: "Delivered", variant: "default", icon: CheckCircle2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default function BuyerOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          My Orders
        </h1>
        <Link href="/marketplace">
          <Button>
            <ShoppingCart className="w-4 h-4" />
            Browse Products
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <Input placeholder="Search orders..." className="pl-9" />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-secondary)]">
                {["Order", "Product", "Supplier", "Amount", "Status", "Date", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((order) => {
                const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.paid;
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-secondary)]/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[var(--obsidian)]">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-secondary)] max-w-[200px] truncate block">
                        {order.product}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {order.supplier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[var(--obsidian)]">
                        {formatPrice(order.amount, order.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={config.variant}>
                        <config.icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--text-tertiary)]">
                        {new Date(order.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-xs font-semibold text-[var(--amber-dark)] hover:text-[var(--amber)] transition-colors flex items-center gap-1"
                      >
                        View
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
