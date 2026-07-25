"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Package, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSupplierOrderStatus } from "@/lib/actions/orders";
import { STATUS_ACTIONS, STATUS_LABELS } from "./status-config";

export interface OrderRow {
  id: string;
  orderNumber: string;
  buyer: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

// Logical lifecycle order for tab ordering — only statuses actually present
// among this supplier's orders get a tab.
const STATUS_SEQUENCE = [
  "draft", "pending_approval", "pending_payment", "deposit_paid", "paid",
  "confirmed", "in_production", "quality_check", "ready_to_ship",
  "assigned_to_logistics", "dispatched", "in_transit", "out_for_delivery",
  "delivered", "completed", "cancelled", "disputed", "refund_requested", "refunded",
];

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-[var(--indigo)]/10 text-[var(--indigo)] border-[var(--indigo)]/20">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function OrderQuickAction({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const action = STATUS_ACTIONS[status];
  if (!action) return null;

  function handleClick() {
    startTransition(async () => {
      const res = await updateSupplierOrderStatus(orderId, action.next);
      if (!res.success) toast.error(res.error ?? "Failed to update order");
      else {
        toast.success(`Order updated to ${STATUS_LABELS[action.next] ?? action.next}`);
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--indigo)]/10 text-[var(--indigo)] border border-[var(--indigo)]/20 hover:bg-[var(--indigo)]/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : null}
      {action.label}
    </button>
  );
}

export default function OrdersTable({
  orders,
}: {
  orders: OrderRow[];
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const tabs = useMemo(() => {
    const present = new Set(orders.map((o) => o.status));
    const ordered = STATUS_SEQUENCE.filter((s) => present.has(s));
    return [
      { value: "all", label: "All Orders", count: orders.length },
      ...ordered.map((s) => ({
        value: s,
        label: STATUS_LABELS[s] ?? s,
        count: orders.filter((o) => o.status === s).length,
      })),
    ];
  }, [orders]);

  const filtered = orders.filter((o) => {
    const matchesTab = activeTab === "all" || o.status === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Incoming Orders
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Review and manage orders from buyers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.value
                ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.value
                  ? "bg-[var(--amber)]/20 text-[var(--amber-dark)]"
                  : "bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
        />
        <input
          type="text"
          placeholder="Search by order number or buyer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20 transition-all"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Order</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Buyer</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Items</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Total</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Status</th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">Date</th>
                <th className="text-right py-3 px-4 text-[var(--text-tertiary)] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-[var(--text-primary)]">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-primary)] font-medium">
                    {order.buyer}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {formatMoney(order.totalAmount, order.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4 text-[var(--text-tertiary)]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <OrderQuickAction orderId={order.id} status={order.status} />
                      <Link
                        href={`/supplier/orders/${order.id}`}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-tertiary)] transition-colors"
                      >
                        <ArrowUpRight size={14} className="text-[var(--text-tertiary)]" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Package
              size={40}
              className="mx-auto text-[var(--text-tertiary)] mb-3"
            />
            <p className="text-[var(--text-secondary)] font-medium">
              No orders found
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Orders matching your criteria will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-[var(--text-tertiary)]">
        <p>
          Showing {filtered.length} of {orders.length} orders
        </p>
      </div>
    </div>
  );
}
