"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertCircle,
  RotateCcw,
  CreditCard,
  Smartphone,
  Landmark,
  Users,
  Loader2,
  Package,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface OrderRow {
  id: string;
  order_number: string;
  subtotal: number;
  total_shipping: number;
  total_tax: number;
  grand_total: number;
  currency: string;
  status: string | null;
  market_region: string | null;
  buyer_company_name: string | null;
  created_at: string;
  buyer_user_id: string;
  user_profiles: { full_name: string | null; email: string | null; country_code: string | null } | null;
  supplierCount: number;
  paymentGateway: string | null;
}

/* ------------------------------------------------------------------ */
/*  Config maps — mirrors b2b_order_status / payment_gateway enums     */
/* ------------------------------------------------------------------ */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  draft:                 { label: "Draft",                 color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock },
  pending_approval:      { label: "Pending Approval",      color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  pending_payment:       { label: "Pending Payment",       color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  deposit_paid:          { label: "Deposit Paid",          color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: CheckCircle2 },
  paid:                  { label: "Paid",                  color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: CheckCircle2 },
  confirmed:              { label: "Confirmed",             color: "var(--indigo)", bg: "color-mix(in srgb, var(--indigo) 10%, transparent)", icon: CheckCircle2 },
  in_production:         { label: "In Production",         color: "var(--amber-dark)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)", icon: AlertCircle },
  quality_check:         { label: "Quality Check",         color: "var(--amber-dark)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)", icon: AlertCircle },
  ready_to_ship:         { label: "Ready to Ship",         color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Truck },
  assigned_to_logistics: { label: "Assigned to Logistics", color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Truck },
  dispatched:            { label: "Dispatched",            color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Truck },
  in_transit:            { label: "In Transit",            color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Truck },
  out_for_delivery:      { label: "Out for Delivery",      color: "var(--info)", bg: "color-mix(in srgb, var(--info) 10%, transparent)", icon: Truck },
  delivered:             { label: "Delivered",             color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  completed:             { label: "Completed",             color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  cancelled:             { label: "Cancelled",             color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: XCircle },
  disputed:              { label: "Disputed",              color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 10%, transparent)", icon: AlertCircle },
  refund_requested:      { label: "Refund Requested",      color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: RotateCcw },
  refunded:              { label: "Refunded",              color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: RotateCcw },
};

function statusMeta(status: string | null) {
  return status ? STATUS_CONFIG[status] ?? { label: status, color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock } : { label: "Unknown", color: "var(--text-tertiary)", bg: "var(--surface-secondary)", icon: Clock };
}

const PAYMENT_CONFIG: Record<string, { label: string; icon: typeof CreditCard }> = {
  mtn_momo:        { label: "MTN MoMo", icon: Smartphone },
  airtel_money:    { label: "Airtel Money", icon: Smartphone },
  tigo_cash:       { label: "Tigo Cash", icon: Smartphone },
  mpesa:           { label: "M-Pesa", icon: Smartphone },
  stripe:          { label: "Stripe", icon: CreditCard },
  alipay:          { label: "Alipay", icon: CreditCard },
  wechat_pay:      { label: "WeChat Pay", icon: CreditCard },
  bank_transfer:   { label: "Bank Transfer", icon: Landmark },
  escrow:          { label: "Escrow", icon: Landmark },
  platform_wallet: { label: "Platform Wallet", icon: CreditCard },
  xtransfer:       { label: "XTransfer", icon: Landmark },
  flutterwave:     { label: "Flutterwave", icon: CreditCard },
};

const COUNTRY_FLAGS: Record<string, string> = {
  GH: "🇬🇭", NG: "🇳🇬", KE: "🇰🇪", UG: "🇺🇬", TZ: "🇹🇿", RW: "🇷🇼",
  ET: "🇪🇹", ZA: "🇿🇦", CM: "🇨🇲", SN: "🇸🇳", CI: "🇨🇮", CD: "🇨🇩",
  MZ: "🇲🇿", ZM: "🇿🇲", ZW: "🇿🇼", EG: "🇪🇬", MA: "🇲🇦", CN: "🇨🇳",
  TW: "🇹🇼", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵", KR: "🇰🇷", VN: "🇻🇳",
  TH: "🇹🇭", MY: "🇲🇾", ID: "🇮🇩", SG: "🇸🇬", PH: "🇵🇭",
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 0 }).format((cents || 0) / 100);
}

function exportCsv(rows: OrderRow[]) {
  const header = ["Order Number", "Buyer", "Country", "Suppliers", "Total", "Currency", "Payment", "Status", "Date"];
  const lines = rows.map((o) => [
    o.order_number,
    o.buyer_company_name || o.user_profiles?.full_name || "",
    o.user_profiles?.country_code || "",
    String(o.supplierCount),
    ((o.grand_total || 0) / 100).toFixed(2),
    o.currency,
    o.paymentGateway || "",
    o.status || "",
    o.created_at,
  ]);
  const csv = [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const LIMIT = 25;

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    params.set("limit", String(LIMIT));
    params.set("offset", String(offset));
    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, offset]);

  useEffect(() => {
    const debounce = setTimeout(fetchOrders, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [fetchOrders]);

  useEffect(() => { setOffset(0); }, [statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Orders
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            All platform orders across suppliers and buyers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchOrders} title="Refresh" className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => exportCsv(orders)} disabled={orders.length === 0} className="btn-outline !py-2 !px-4 !text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl text-sm font-medium cursor-pointer outline-none"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 max-w-sm" style={{ background: "var(--surface-primary)", border: "1px solid var(--border-subtle)" }}>
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
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--text-tertiary)" }}>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-12 h-12 mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No orders found</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {search ? "Try a different search term" : "Orders will appear here once buyers check out"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Order", "Buyer", "Supplier(s)", "Total", "Payment", "Status", "Date", ""].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const status = statusMeta(o.status);
                  const payment = o.paymentGateway ? PAYMENT_CONFIG[o.paymentGateway] : null;
                  const PayIcon = payment?.icon;
                  const buyerName = o.buyer_company_name || o.user_profiles?.full_name || "Unknown Buyer";
                  const flag = o.user_profiles?.country_code ? COUNTRY_FLAGS[o.user_profiles.country_code] || "" : "";

                  return (
                    <tr key={o.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{o.order_number}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{flag} {buyerName}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: "color-mix(in srgb, var(--indigo) 10%, transparent)", color: "var(--indigo)" }}>
                          <Users className="w-3 h-3" />
                          {o.supplierCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{money(o.grand_total, o.currency)}</span>
                      </td>
                      <td className="px-5 py-4">
                        {payment ? (
                          <div className="flex items-center gap-2">
                            {PayIcon && <PayIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{payment.label}</span>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/orders/${o.id}`} className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-secondary)] inline-flex items-center" style={{ color: "var(--text-tertiary)" }}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + LIMIT, total)} of {total} orders
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={offset + LIMIT >= total}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
