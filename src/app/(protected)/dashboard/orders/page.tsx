"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowUpRight,
  Search,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/* ─────────────────────────────────────────────────────────── types */

interface SupplierOrderItem {
  product_name: string;
  quantity: number;
}

interface SupplierOrder {
  id: string;
  status: string;
  total_amount: number;
  companies: { name: string } | null;
  supplier_order_items: SupplierOrderItem[];
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  grand_total: number;
  created_at: string;
  supplier_orders: SupplierOrder[];
}

/* ─────────────────────────────────────────────────────────── config */

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  pending_payment: { label: "Payment Due",   variant: "destructive", icon: AlertCircle },
  paid:            { label: "Paid",           variant: "secondary",  icon: CheckCircle2 },
  confirmed:       { label: "Confirmed",      variant: "secondary",  icon: CheckCircle2 },
  in_production:   { label: "In Production",  variant: "secondary",  icon: Clock },
  in_transit:      { label: "In Transit",     variant: "outline",    icon: Truck },
  delivered:       { label: "Delivered",      variant: "default",    icon: Package },
  completed:       { label: "Completed",      variant: "default",    icon: CheckCircle2 },
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function primaryProduct(order: Order): string {
  const allItems = order.supplier_orders.flatMap((so) => so.supplier_order_items);
  if (allItems.length === 0) return "—";
  const first = allItems[0].product_name;
  return allItems.length > 1 ? `${first} +${allItems.length - 1} more` : first;
}

function primarySupplier(order: Order): string {
  const names = order.supplier_orders
    .map((so) => so.companies?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "—";
  return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
}

/* ─────────────────────────────────────────────────────────── page */

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error();
      const { orders } = await res.json();
      setOrders(orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <Input
          placeholder="Search by order number..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-10 h-10 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-secondary)] font-medium">No orders yet</p>
            <Link href="/marketplace">
              <Button size="sm" variant="outline">Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--surface-secondary)]">
                  {["Order", "Product", "Supplier", "Amount", "Status", "Date", ""].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.1em] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.paid;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-secondary)]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-[var(--obsidian)]">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-secondary)] max-w-[200px] truncate block">
                          {primaryProduct(order)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {primarySupplier(order)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-[var(--obsidian)]">
                          {formatPrice(order.grand_total, order.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                          <config.icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {new Date(order.created_at).toLocaleDateString("en-US", {
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
        )}
      </div>
    </div>
  );
}
