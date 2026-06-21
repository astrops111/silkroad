"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Package, Truck, CheckCircle2, XCircle, Clock,
  AlertCircle, MapPin, Mail, Building, Loader2, Download,
  CreditCard, Smartphone, Landmark, Copy,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
type PaymentMethod = "mtn_momo" | "airtel_money" | "mpesa" | "stripe" | "bank_transfer" | "alipay";
interface LineItem { sku: string; name: string; qty: number; unitPrice: number; }
interface OrderDetail {
  id: string; orderNumber: string;
  buyer: string; buyerCountry: string; buyerCity: string; buyerEmail: string;
  suppliers: string[]; items: LineItem[];
  total: number; currency: string; paymentMethod: PaymentMethod;
  status: OrderStatus; date: string;
  shippingAddress: string; trackingNumber: string | null; notes: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data (mirrors orders list)                                     */
/* ------------------------------------------------------------------ */
const ORDERS: OrderDetail[] = [
  { id: "1", orderNumber: "ORD-2025-4871", buyer: "TechHub Ghana Ltd.", buyerCountry: "🇬🇭", buyerCity: "Accra, Ghana", buyerEmail: "orders@techhubgh.com", suppliers: ["Shenzhen TechParts Co."], items: [{ sku: "STP-USB3-HUB", name: "7-Port USB 3.0 Hub", qty: 50, unitPrice: 148 }, { sku: "STP-HDMI-4K", name: "HDMI 4K Cable 2m", qty: 200, unitPrice: 12 }, { sku: "STP-WALL-EU", name: "EU Wall Charger 65W GaN", qty: 30, unitPrice: 124 }], total: 12400, currency: "USD", paymentMethod: "mtn_momo", status: "confirmed", date: "2025-04-16", shippingAddress: "TechHub Ghana Ltd., Plot 7, Ring Road Central, Accra, GH", trackingNumber: null, notes: "" },
  { id: "2", orderNumber: "ORD-2025-4870", buyer: "Kampala Retail Group", buyerCountry: "🇺🇬", buyerCity: "Kampala, Uganda", buyerEmail: "procurement@krg.ug", suppliers: ["Guangzhou Huawei Electronics Ltd.", "Dongguan Plastics Manufacturing"], items: [{ sku: "GHE-TAB-10", name: "Android Tablet 10\"", qty: 50, unitPrice: 285 }, { sku: "GHE-CASE-TAB", name: "Tablet Case", qty: 50, unitPrice: 18 }, { sku: "DPM-STORAGE-L", name: "Plastic Storage Container L", qty: 300, unitPrice: 3.5 }], total: 28750, currency: "USD", paymentMethod: "airtel_money", status: "processing", date: "2025-04-15", shippingAddress: "Kampala Retail Group, Nakivubo Rd, Kampala, UG", trackingNumber: null, notes: "Buyer requested consolidated shipping." },
  { id: "3", orderNumber: "ORD-2025-4869", buyer: "Shanghai Imports Trading", buyerCountry: "🇨🇳", buyerCity: "Shanghai, China", buyerEmail: "trade@shanghaiimports.cn", suppliers: ["Kigali Coffee Collective"], items: [{ sku: "KCC-AA-250G", name: "Rwanda AA Green Coffee 250g", qty: 400, unitPrice: 12.5 }, { sku: "KCC-PEABERRY", name: "Peaberry Reserve 500g", qty: 100, unitPrice: 30 }], total: 8200, currency: "USD", paymentMethod: "alipay", status: "shipped", date: "2025-04-14", shippingAddress: "Shanghai FTZ Bonded Warehouse B-7, Shanghai, CN", trackingNumber: "COSCO-SH2025041801", notes: "" },
  { id: "4", orderNumber: "ORD-2025-4868", buyer: "Dar es Salaam Wholesale", buyerCountry: "🇹🇿", buyerCity: "Dar es Salaam, Tanzania", buyerEmail: "buy@darwholesale.tz", suppliers: ["Shenzhen TechParts Co."], items: [{ sku: "STP-KBD-BT", name: "Bluetooth Keyboard Slim", qty: 30, unitPrice: 78 }, { sku: "STP-MOUSE-WL", name: "Wireless Mouse Ergonomic", qty: 30, unitPrice: 53 }, { sku: "STP-WEBCAM-HD", name: "HD 1080p Webcam", qty: 15, unitPrice: 76 }], total: 5430, currency: "USD", paymentMethod: "mpesa", status: "delivered", date: "2025-04-12", shippingAddress: "Dar es Salaam Wholesale, Kariakoo Market, Dar es Salaam, TZ", trackingNumber: "MSC-TZ2025041201", notes: "" },
  { id: "5", orderNumber: "ORD-2025-4867", buyer: "Guangzhou Import Co.", buyerCountry: "🇨🇳", buyerCity: "Guangzhou, China", buyerEmail: "import@gzco.cn", suppliers: ["Nairobi Fresh Produce Co-op", "Addis Ababa Textiles PLC"], items: [{ sku: "NFC-TEA-KE", name: "Kenya Purple Tea 1kg", qty: 200, unitPrice: 38 }, { sku: "AAT-COTTON-RW", name: "Hand-Woven Cotton Runner 2m", qty: 80, unitPrice: 55 }], total: 15900, currency: "USD", paymentMethod: "bank_transfer", status: "pending", date: "2025-04-16", shippingAddress: "Guangzhou Import Co., Haizhu District, Guangzhou, CN", trackingNumber: null, notes: "Wire transfer pending confirmation." },
  { id: "6", orderNumber: "ORD-2025-4866", buyer: "Lagos MegaStore", buyerCountry: "🇳🇬", buyerCity: "Lagos, Nigeria", buyerEmail: "orders@lagosms.ng", suppliers: ["Guangzhou Huawei Electronics Ltd."], items: [{ sku: "GHE-PHONE-MID", name: "Android Smartphone 6.7\"", qty: 80, unitPrice: 195 }, { sku: "GHE-EARBUDS", name: "TWS Earbuds Pro", qty: 120, unitPrice: 95 }, { sku: "GHE-CHARGER-65", name: "65W Fast Charger", qty: 160, unitPrice: 48 }], total: 41200, currency: "USD", paymentMethod: "stripe", status: "confirmed", date: "2025-04-13", shippingAddress: "Lagos MegaStore, Oshodi, Lagos, NG", trackingNumber: null, notes: "" },
  { id: "7", orderNumber: "ORD-2025-4865", buyer: "Mombasa Traders Ltd.", buyerCountry: "🇰🇪", buyerCity: "Mombasa, Kenya", buyerEmail: "logistics@mombasatraders.ke", suppliers: ["Shenzhen TechParts Co.", "Dongguan Plastics Manufacturing", "Guangzhou Huawei Electronics Ltd."], items: [{ sku: "STP-SOLAR-20", name: "Solar Power Bank 20000mAh", qty: 100, unitPrice: 124 }, { sku: "DPM-CRATE-XL", name: "Plastic Crate XL Heavy Duty", qty: 200, unitPrice: 8.4 }, { sku: "GHE-LED-BULB", name: "LED Bulb E27 15W Pack 10", qty: 300, unitPrice: 22 }], total: 67800, currency: "USD", paymentMethod: "mtn_momo", status: "processing", date: "2025-04-11", shippingAddress: "Mombasa Traders Ltd., Mombasa Port, KE", trackingNumber: "EVERGREEN-KE2025041101", notes: "Multi-supplier consolidated shipment." },
  { id: "8", orderNumber: "ORD-2025-4864", buyer: "Casablanca Imports", buyerCountry: "🇲🇦", buyerCity: "Casablanca, Morocco", buyerEmail: "import@casaimports.ma", suppliers: ["Guangzhou Huawei Electronics Ltd."], items: [{ sku: "GHE-LAPTOP-14", name: "Laptop 14\" 8GB/256GB", qty: 20, unitPrice: 280 }, { sku: "GHE-LAPTOP-BAG", name: "Laptop Bag 14\" Waterproof", qty: 20, unitPrice: 27.5 }], total: 9100, currency: "USD", paymentMethod: "stripe", status: "cancelled", date: "2025-04-10", shippingAddress: "Casablanca Imports SA, Port of Casablanca, MA", trackingNumber: null, notes: "Cancelled by buyer — duty calculation dispute." },
];

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending:    { label: "Pending",    color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  confirmed:  { label: "Confirmed",  color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: CheckCircle2 },
  processing: { label: "Processing", color: "var(--amber)",   bg: "color-mix(in srgb, var(--amber) 12%, transparent)",   icon: AlertCircle },
  shipped:    { label: "Shipped",    color: "var(--indigo)",  bg: "color-mix(in srgb, var(--indigo) 10%, transparent)",  icon: Truck },
  delivered:  { label: "Delivered",  color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
};
const paymentConfig: Record<PaymentMethod, { label: string; icon: typeof CreditCard }> = {
  mtn_momo:     { label: "MTN Mobile Money", icon: Smartphone },
  airtel_money: { label: "Airtel Money",     icon: Smartphone },
  mpesa:        { label: "M-Pesa",           icon: Smartphone },
  stripe:       { label: "Stripe",           icon: CreditCard },
  bank_transfer:{ label: "Bank Transfer",    icon: Landmark },
  alipay:       { label: "Alipay",           icon: CreditCard },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const order = ORDERS.find((o) => o.id === id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState(order?.notes ?? "");

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Package className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Order not found</p>
        <Link href="/admin/orders" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to orders</Link>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const payment = paymentConfig[order.paymentMethod];
  const PayIcon = payment.icon;

  async function handleAction(action: string) {
    setActionLoading(action);
    await new Promise((r) => setTimeout(r, 700));
    setActionLoading(null);
    if (action === "cancel") toast.error("Order cancelled");
    else toast.success(action === "approve" ? "Order confirmed" : action === "hold" ? "Order placed on hold" : "Note saved");
  }

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
                {order.orderNumber}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Placed {new Date(order.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button className="btn-outline !py-2 !px-4 !text-sm shrink-0">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Order Total",  value: `$${order.total.toLocaleString()} ${order.currency}`, accent: "var(--amber)" },
          { label: "Line Items",   value: `${order.items.length} SKU${order.items.length > 1 ? "s" : ""}`, accent: "var(--indigo)" },
          { label: "Suppliers",    value: `${order.suppliers.length} supplier${order.suppliers.length > 1 ? "s" : ""}`, accent: "var(--success)" },
          { label: "Tracking",     value: order.trackingNumber ?? "Not shipped", accent: order.trackingNumber ? "var(--success)" : "var(--text-tertiary)" },
        ].map((k) => (
          <div key={k.label} className="p-4 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{k.label}</p>
            <p className="text-sm font-bold truncate" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: items + shipment + note */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-subtle)" }}>
              <Package className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["SKU", "Description", "Qty", "Unit Price", "Subtotal"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.sku} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>{item.sku}</span>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.qty}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-secondary)" }}>${item.unitPrice.toLocaleString()}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>${(item.qty * item.unitPrice).toLocaleString()}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-secondary)" }}>
                    <td colSpan={4} className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Order Total</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>${order.total.toLocaleString()}</span>
                      <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>{order.currency}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Shipment */}
          <div className="rounded-2xl border p-6 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Shipment</h2>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{order.shippingAddress}</p>
            </div>
            {order.trackingNumber ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Tracking:</span>
                <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{order.trackingNumber}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(order.trackingNumber!); toast.success("Copied"); }}
                  className="p-1 rounded" style={{ color: "var(--text-tertiary)" }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No tracking number yet — shipment not created</p>
            )}
          </div>

          {/* Admin note */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Admin Note</h2>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Internal notes (not shown to buyer or supplier)…"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <button
              onClick={() => handleAction("save_note")}
              disabled={actionLoading === "save_note"}
              className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              {actionLoading === "save_note" ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Save note"}
            </button>
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
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{order.buyerCountry} {order.buyer}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{order.buyerCity}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{order.buyerEmail}</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>Suppliers</p>
              {order.suppliers.map((s) => (
                <p key={s} className="text-xs py-0.5" style={{ color: "var(--text-secondary)" }}>• {s}</p>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-2 mb-1">
              <PayIcon className="w-4 h-4" style={{ color: "var(--amber)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Payment</h2>
            </div>
            {[
              { label: "Method", value: payment.label },
              { label: "Amount", value: `$${order.total.toLocaleString()} ${order.currency}` },
              { label: "Status", value: order.status === "cancelled" ? "Refunded" : order.status === "pending" ? "Awaiting" : "Received" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{row.label}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {(order.status === "pending" || order.status === "confirmed" || order.status === "processing") && (
            <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>
              {order.status === "pending" && (
                <button onClick={() => handleAction("approve")} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--success)", color: "white" }}>
                  {actionLoading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Order
                </button>
              )}
              <button onClick={() => handleAction("hold")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 30%, transparent)", background: "color-mix(in srgb, var(--warning) 8%, transparent)" }}>
                {actionLoading === "hold" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />} Place on Hold
              </button>
              <button onClick={() => handleAction("cancel")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                {actionLoading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Cancel Order
              </button>
            </div>
          )}

          {order.notes && (
            <div className="rounded-2xl border p-4" style={{ background: "color-mix(in srgb, var(--warning) 6%, transparent)", borderColor: "color-mix(in srgb, var(--warning) 20%, transparent)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--warning)" }}>Note</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
