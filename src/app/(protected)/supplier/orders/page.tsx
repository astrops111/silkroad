"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle2,
  Truck,
  Clock,
  Package,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered";

interface Order {
  id: string;
  order_number: string;
  buyer: string;
  items: number;
  total: string;
  status: OrderStatus;
  date: string;
}

const ORDERS: Order[] = [
  {
    id: "1",
    order_number: "SR-20260416-001",
    buyer: "Guangzhou Trading Co.",
    items: 3,
    total: "$3,240.00",
    status: "pending",
    date: "Apr 16, 2026",
  },
  {
    id: "2",
    order_number: "SR-20260415-003",
    buyer: "Shanghai Imports Inc.",
    items: 1,
    total: "$12,500.00",
    status: "pending",
    date: "Apr 15, 2026",
  },
  {
    id: "3",
    order_number: "SR-20260414-002",
    buyer: "Shenzhen Imports Ltd",
    items: 5,
    total: "$8,750.00",
    status: "confirmed",
    date: "Apr 14, 2026",
  },
  {
    id: "4",
    order_number: "SR-20260413-006",
    buyer: "Beijing Wholesale Group",
    items: 2,
    total: "$4,320.00",
    status: "confirmed",
    date: "Apr 13, 2026",
  },
  {
    id: "5",
    order_number: "SR-20260412-004",
    buyer: "Lagos Wholesale Hub",
    items: 4,
    total: "$1,890.00",
    status: "shipped",
    date: "Apr 12, 2026",
  },
  {
    id: "6",
    order_number: "SR-20260411-008",
    buyer: "Nairobi Fresh Goods",
    items: 2,
    total: "$5,120.00",
    status: "shipped",
    date: "Apr 11, 2026",
  },
  {
    id: "7",
    order_number: "SR-20260410-005",
    buyer: "Cairo Spice Market",
    items: 6,
    total: "$2,460.00",
    status: "delivered",
    date: "Apr 10, 2026",
  },
  {
    id: "8",
    order_number: "SR-20260409-009",
    buyer: "Accra Gold Traders",
    items: 1,
    total: "$7,800.00",
    status: "delivered",
    date: "Apr 9, 2026",
  },
];

const TABS: { value: string; label: string; count: number }[] = [
  { value: "all", label: "All Orders", count: ORDERS.length },
  {
    value: "pending",
    label: "Pending",
    count: ORDERS.filter((o) => o.status === "pending").length,
  },
  {
    value: "confirmed",
    label: "Confirmed",
    count: ORDERS.filter((o) => o.status === "confirmed").length,
  },
  {
    value: "shipped",
    label: "Shipped",
    count: ORDERS.filter((o) => o.status === "shipped").length,
  },
  {
    value: "delivered",
    label: "Delivered",
    count: ORDERS.filter((o) => o.status === "delivered").length,
  },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<
    OrderStatus,
    { class: string; icon: React.ElementType }
  > = {
    pending: {
      class:
        "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/20",
      icon: Clock,
    },
    confirmed: {
      class:
        "bg-[var(--indigo)]/10 text-[var(--indigo)] border-[var(--indigo)]/20",
      icon: CheckCircle2,
    },
    shipped: {
      class: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20",
      icon: Truck,
    },
    delivered: {
      class:
        "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
      icon: Package,
    },
  };
  const { class: className, icon: Icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${className}`}
    >
      <Icon size={12} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function SupplierOrders() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = ORDERS.filter((o) => {
    const matchesTab = activeTab === "all" || o.status === activeTab;
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer.toLowerCase().includes(search.toLowerCase());
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
        {TABS.map((tab) => (
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
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Order
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Buyer
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Items
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Total
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Date
                </th>
                <th className="text-right py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-[var(--text-primary)]">
                    {order.order_number}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-primary)] font-medium">
                    {order.buyer}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {order.items} {order.items === 1 ? "item" : "items"}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {order.total}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4 text-[var(--text-tertiary)]">
                    {order.date}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.status === "pending" && (
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--indigo)]/10 text-[var(--indigo)] border border-[var(--indigo)]/20 hover:bg-[var(--indigo)]/20 transition-colors">
                          Confirm
                        </button>
                      )}
                      {order.status === "confirmed" && (
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20 hover:bg-[var(--info)]/20 transition-colors">
                          Ship
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg hover:bg-[var(--surface-tertiary)] transition-colors">
                        <ArrowUpRight
                          size={14}
                          className="text-[var(--text-tertiary)]"
                        />
                      </button>
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
          Showing {filtered.length} of {ORDERS.length} orders
        </p>
      </div>
    </div>
  );
}
