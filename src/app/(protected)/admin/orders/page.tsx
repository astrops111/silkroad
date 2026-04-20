"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  CreditCard,
  Smartphone,
  Landmark,
  Users,
  Calendar,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & data                                                       */
/* ------------------------------------------------------------------ */
type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentMethod =
  | "mtn_momo"
  | "airtel_money"
  | "mpesa"
  | "stripe"
  | "bank_transfer"
  | "alipay";

interface Order {
  id: string;
  orderNumber: string;
  buyer: string;
  buyerCountry: string;
  suppliers: string[];
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  date: string;
}

const orders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2025-4871",
    buyer: "TechHub Ghana Ltd.",
    buyerCountry: "\uD83C\uDDEC\uD83C\uDDED",
    suppliers: ["Shenzhen TechParts Co."],
    total: 12400,
    currency: "USD",
    paymentMethod: "mtn_momo",
    status: "confirmed",
    date: "2025-04-16",
  },
  {
    id: "2",
    orderNumber: "ORD-2025-4870",
    buyer: "Kampala Retail Group",
    buyerCountry: "\uD83C\uDDFA\uD83C\uDDEC",
    suppliers: ["Guangzhou Huawei Electronics Ltd.", "Dongguan Plastics Manufacturing"],
    total: 28750,
    currency: "USD",
    paymentMethod: "airtel_money",
    status: "processing",
    date: "2025-04-15",
  },
  {
    id: "3",
    orderNumber: "ORD-2025-4869",
    buyer: "Shanghai Imports Trading",
    buyerCountry: "\uD83C\uDDE8\uD83C\uDDF3",
    suppliers: ["Kigali Coffee Collective"],
    total: 8200,
    currency: "USD",
    paymentMethod: "alipay",
    status: "shipped",
    date: "2025-04-14",
  },
  {
    id: "4",
    orderNumber: "ORD-2025-4868",
    buyer: "Dar es Salaam Wholesale",
    buyerCountry: "\uD83C\uDDF9\uD83C\uDDFF",
    suppliers: ["Shenzhen TechParts Co."],
    total: 5430,
    currency: "USD",
    paymentMethod: "mpesa",
    status: "delivered",
    date: "2025-04-12",
  },
  {
    id: "5",
    orderNumber: "ORD-2025-4867",
    buyer: "Guangzhou Import Co.",
    buyerCountry: "\uD83C\uDDE8\uD83C\uDDF3",
    suppliers: ["Nairobi Fresh Produce Co-op", "Addis Ababa Textiles PLC"],
    total: 15900,
    currency: "USD",
    paymentMethod: "bank_transfer",
    status: "pending",
    date: "2025-04-16",
  },
  {
    id: "6",
    orderNumber: "ORD-2025-4866",
    buyer: "Lagos MegaStore",
    buyerCountry: "\uD83C\uDDF3\uD83C\uDDEC",
    suppliers: ["Guangzhou Huawei Electronics Ltd."],
    total: 41200,
    currency: "USD",
    paymentMethod: "stripe",
    status: "confirmed",
    date: "2025-04-13",
  },
  {
    id: "7",
    orderNumber: "ORD-2025-4865",
    buyer: "Mombasa Traders Ltd.",
    buyerCountry: "\uD83C\uDDF0\uD83C\uDDEA",
    suppliers: ["Shenzhen TechParts Co.", "Dongguan Plastics Manufacturing", "Guangzhou Huawei Electronics Ltd."],
    total: 67800,
    currency: "USD",
    paymentMethod: "mtn_momo",
    status: "processing",
    date: "2025-04-11",
  },
  {
    id: "8",
    orderNumber: "ORD-2025-4864",
    buyer: "Casablanca Imports",
    buyerCountry: "\uD83C\uDDF2\uD83C\uDDE6",
    suppliers: ["Guangzhou Huawei Electronics Ltd."],
    total: 9100,
    currency: "USD",
    paymentMethod: "stripe",
    status: "cancelled",
    date: "2025-04-10",
  },
];

/* ------------------------------------------------------------------ */
/*  Config maps                                                        */
/* ------------------------------------------------------------------ */
const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 10%, transparent)",
  },
  confirmed: {
    label: "Confirmed",
    color: "var(--indigo)",
    bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",
  },
  processing: {
    label: "Processing",
    color: "var(--amber-dark)",
    bg: "color-mix(in srgb, var(--amber) 12%, transparent)",
  },
  shipped: {
    label: "Shipped",
    color: "var(--info)",
    bg: "color-mix(in srgb, var(--info) 10%, transparent)",
  },
  delivered: {
    label: "Delivered",
    color: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 10%, transparent)",
  },
};

const paymentMethodConfig: Record<
  PaymentMethod,
  { label: string; icon: typeof CreditCard; color: string }
> = {
  mtn_momo: { label: "MTN MoMo", icon: Smartphone, color: "#FFCC00" },
  airtel_money: { label: "Airtel Money", icon: Smartphone, color: "#ED1C24" },
  mpesa: { label: "M-Pesa", icon: Smartphone, color: "#4CAF50" },
  stripe: { label: "Stripe", icon: CreditCard, color: "#635BFF" },
  bank_transfer: { label: "Bank Transfer", icon: Landmark, color: "var(--text-tertiary)" },
  alipay: { label: "Alipay", icon: CreditCard, color: "#1677FF" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Orders
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            All platform orders across suppliers and buyers
          </p>
        </div>
        <button className="btn-outline !py-2 !px-4 !text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer outline-none"
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>

        {/* Date range placeholder */}
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <Calendar className="w-4 h-4" />
          Apr 10 - Apr 17, 2025
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-sm"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search by order number or buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {[
                  "Order",
                  "Buyer",
                  "Supplier(s)",
                  "Total",
                  "Payment",
                  "Status",
                  "Date",
                  "",
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
              {filtered.map((o) => {
                const status = statusConfig[o.status];
                const payment = paymentMethodConfig[o.paymentMethod];
                const PayIcon = payment.icon;

                return (
                  <tr
                    key={o.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--surface-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Order number */}
                    <td className="px-5 py-4">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {o.orderNumber}
                      </span>
                    </td>

                    {/* Buyer */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {o.buyerCountry} {o.buyer}
                        </span>
                      </div>
                    </td>

                    {/* Suppliers */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {o.suppliers[0]}
                        </span>
                        {o.suppliers.length > 1 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              background: "color-mix(in srgb, var(--indigo) 10%, transparent)",
                              color: "var(--indigo)",
                            }}
                          >
                            <Users className="w-3 h-3" />
                            +{o.suppliers.length - 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        ${o.total.toLocaleString()}
                      </span>
                      <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>
                        {o.currency}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <PayIcon className="w-4 h-4" style={{ color: payment.color }} />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {payment.label}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {status.label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(o.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-secondary)]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-secondary)]"
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
            Showing {filtered.length} of {orders.length} orders
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((p) => (
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
