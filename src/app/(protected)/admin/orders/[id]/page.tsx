"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Package, Truck, CheckCircle2, XCircle, Clock,
  AlertCircle, Mail, Building, Loader2, Download, RotateCcw,
  CreditCard, Smartphone, Landmark, Globe, Ban,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types — matches the shape returned by GET /api/admin/orders        */
/* ------------------------------------------------------------------ */
interface OrderDetail {
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
/*  Config — mirrors b2b_order_status / payment_gateway enums          */
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

// Only enum values that are BOTH accepted by the b2b_order_status DB enum AND
// allowed by PATCH /api/admin/orders's own allow-list. That allow-list also
// contains "processing" and "shipped", which are not valid b2b_order_status
// values — selecting them would 500. They're intentionally excluded here.
const SELECTABLE_STATUSES = ["pending_payment", "paid", "delivered", "completed", "cancelled", "refunded"];

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 0 }).format((cents || 0) / 100);
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/admin/orders has no single-record lookup — it only supports
      // status/search/limit/offset. We pull a large page and find the row by id
      // client-side rather than inventing a new /api/admin/orders/[id] endpoint.
      const res = await fetch(`/api/admin/orders?limit=500`);
      const data = await res.json();
      const found = (data.orders as OrderDetail[] | undefined)?.find((o) => o.id === id) ?? null;
      setOrder(found);
      setNotFound(!found);
      if (found) setNextStatus(found.status ?? "");
    } catch (err) {
      console.error("Failed to fetch order:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function updateStatus(status: string) {
    if (!order) return;
    setActionLoading(status);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status, type: "purchase" }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Order status updated to ${statusMeta(status).label}`);
        await fetchOrder();
      } else {
        toast.error(result.error || "Update failed");
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--amber)" }} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Package className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Order not found</p>
        <Link href="/admin/orders" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to orders</Link>
      </div>
    );
  }

  const status = statusMeta(order.status);
  const StatusIcon = status.icon;
  const payment = order.paymentGateway ? PAYMENT_CONFIG[order.paymentGateway] : null;
  const PayIcon = payment?.icon;
  const isTerminal = order.status === "completed" || order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Orders
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {order.order_number}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Placed {new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button disabled title="Not implemented — no PDF export endpoint exists for orders" className="btn-outline !py-2 !px-4 !text-sm shrink-0 opacity-50 cursor-not-allowed">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Order Total", value: money(order.grand_total, order.currency), accent: "var(--amber)" },
          { label: "Subtotal", value: money(order.subtotal, order.currency), accent: "var(--text-primary)" },
          { label: "Suppliers", value: `${order.supplierCount} supplier${order.supplierCount === 1 ? "" : "s"}`, accent: "var(--success)" },
          { label: "Market Region", value: order.market_region ?? "—", accent: "var(--indigo)" },
        ].map((k) => (
          <div key={k.label} className="p-4 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{k.label}</p>
            <p className="text-sm font-bold truncate" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: financials */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
              <Package className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Financial Breakdown</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {[
                { label: "Subtotal", value: order.subtotal },
                { label: "Shipping", value: order.total_shipping },
                { label: "Tax", value: order.total_tax },
                { label: "Grand Total", value: order.grand_total, bold: true },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-6 py-3.5" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className={row.bold ? "text-sm font-semibold" : "text-sm"} style={{ color: row.bold ? "var(--text-primary)" : "var(--text-secondary)" }}>{row.label}</span>
                  <span className={row.bold ? "text-sm font-bold" : "text-sm font-medium"} style={{ color: "var(--text-primary)" }}>{money(row.value, order.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line items — not available from the admin orders API (only aggregate fields are returned) */}
          <div className="rounded-2xl border p-6 flex items-start gap-3" style={{ background: "var(--surface-secondary)", borderColor: "var(--border-subtle)" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Line items, shipping address, and tracking are not exposed by <code>GET /api/admin/orders</code> — only order-level totals are returned. Viewing that detail would require a dedicated endpoint that doesn&apos;t exist yet.
            </p>
          </div>

          {/* Admin note — not implemented, no field/endpoint exists */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Admin Note</h2>
            <textarea
              disabled
              rows={3}
              placeholder="Not implemented — purchase_orders.note isn't returned by GET /api/admin/orders and PATCH doesn't accept a note field"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none opacity-60 cursor-not-allowed"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
            />
          </div>
        </div>

        {/* Right: buyer, payment, actions */}
        <div className="space-y-5">
          {/* Buyer */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Buyer</h2>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {order.buyer_company_name || order.user_profiles?.full_name || "Unknown Buyer"}
              </p>
              {order.user_profiles?.country_code && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Globe className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{order.user_profiles.country_code}</p>
                </div>
              )}
            </div>
            {order.user_profiles?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{order.user_profiles.email}</span>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              {PayIcon ? <PayIcon className="w-4 h-4" style={{ color: "var(--amber)" }} /> : <CreditCard className="w-4 h-4" style={{ color: "var(--amber)" }} />}
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Payment</h2>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Gateway</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{payment?.label ?? "Not recorded"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Amount</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{money(order.grand_total, order.currency)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>

            {isTerminal ? (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>This order is in a terminal state — no further status changes.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    {SELECTABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>{statusMeta(s).label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => updateStatus(nextStatus)}
                    disabled={!!actionLoading || nextStatus === order.status}
                    className="px-3 py-2 rounded-lg text-xs font-semibold shrink-0"
                    style={{ background: "var(--obsidian)", color: "var(--ivory)" }}
                  >
                    {actionLoading === nextStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </button>
                </div>

                <button onClick={() => updateStatus("cancelled")} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                  {actionLoading === "cancelled" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Cancel Order
                </button>

                <button disabled title="Not implemented — no on-hold status exists in the b2b_order_status enum"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border opacity-50 cursor-not-allowed"
                  style={{ color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 30%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
                  <Ban className="w-4 h-4" /> Place on Hold
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
