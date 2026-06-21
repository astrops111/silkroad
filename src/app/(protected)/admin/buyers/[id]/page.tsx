"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, UserCircle2, CheckCircle2, Clock, XCircle, AlertTriangle,
  Mail, MapPin, ShoppingCart, TrendingUp, CreditCard as CreditCardIcon,
  Loader2, Pencil, Save, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type BuyerStatus = "active" | "pending_kyc" | "suspended" | "inactive";

interface BuyerDetail {
  id: string; companyName: string; contactName: string; email: string;
  countryFlag: string; city: string; country: string;
  totalOrders: number; totalGMV: number; lastOrderDate: string;
  status: BuyerStatus; creditLimit: number | null;
  registeredAt: string; paymentMethods: string[];
}

interface RecentOrder { orderNumber: string; date: string; total: number; status: string; }

/* ------------------------------------------------------------------ */
/*  Mock data (mirrors buyers list)                                     */
/* ------------------------------------------------------------------ */
const BUYERS: BuyerDetail[] = [
  { id: "BUY-001", companyName: "TechHub Ghana", contactName: "Kwame Asante", email: "kwame@techhubgh.com", countryFlag: "🇬🇭", city: "Accra", country: "Ghana", totalOrders: 34, totalGMV: 142800, lastOrderDate: "2026-04-15", status: "active", creditLimit: 50000, registeredAt: "2024-08-12", paymentMethods: ["MTN MoMo", "Stripe"] },
  { id: "BUY-002", companyName: "Nairobi Imports Ltd", contactName: "Amina Wanjiku", email: "amina@nairobiimports.co.ke", countryFlag: "🇰🇪", city: "Nairobi", country: "Kenya", totalOrders: 71, totalGMV: 398500, lastOrderDate: "2026-04-14", status: "active", creditLimit: 120000, registeredAt: "2024-03-05", paymentMethods: ["M-Pesa", "Bank Transfer"] },
  { id: "BUY-003", companyName: "Cairo Electronics", contactName: "Ahmed Hassan", email: "ahmed.h@cairoelectronics.eg", countryFlag: "🇪🇬", city: "Cairo", country: "Egypt", totalOrders: 18, totalGMV: 87200, lastOrderDate: "2026-04-10", status: "active", creditLimit: null, registeredAt: "2024-11-20", paymentMethods: ["Stripe"] },
  { id: "BUY-004", companyName: "Lagos Distribution Co", contactName: "Chidi Okafor", email: "chidi@lagosdist.ng", countryFlag: "🇳🇬", city: "Lagos", country: "Nigeria", totalOrders: 0, totalGMV: 0, lastOrderDate: "—", status: "pending_kyc", creditLimit: null, registeredAt: "2026-04-08", paymentMethods: [] },
  { id: "BUY-005", companyName: "Dar Trading House", contactName: "Fatuma Mshangama", email: "fatuma@dartrading.tz", countryFlag: "🇹🇿", city: "Dar es Salaam", country: "Tanzania", totalOrders: 12, totalGMV: 44600, lastOrderDate: "2026-03-22", status: "active", creditLimit: 20000, registeredAt: "2025-01-14", paymentMethods: ["M-Pesa", "Airtel Money"] },
  { id: "BUY-006", companyName: "Kampala Wholesale Group", contactName: "Robert Mugisha", email: "r.mugisha@kwg.ug", countryFlag: "🇺🇬", city: "Kampala", country: "Uganda", totalOrders: 8, totalGMV: 28900, lastOrderDate: "2026-01-30", status: "suspended", creditLimit: null, registeredAt: "2025-04-21", paymentMethods: ["Airtel Money"] },
  { id: "BUY-007", companyName: "Addis Trade Partners", contactName: "Tigist Bekele", email: "tigist@addistradeEt.com", countryFlag: "🇪🇹", city: "Addis Ababa", country: "Ethiopia", totalOrders: 5, totalGMV: 19200, lastOrderDate: "2026-02-14", status: "inactive", creditLimit: null, registeredAt: "2025-07-03", paymentMethods: ["Bank Transfer"] },
  { id: "BUY-008", companyName: "Kigali Fresh Markets", contactName: "Jean-Pierre Nkurunziza", email: "jp@kigalifresh.rw", countryFlag: "🇷🇼", city: "Kigali", country: "Rwanda", totalOrders: 22, totalGMV: 63400, lastOrderDate: "2026-04-08", status: "active", creditLimit: 30000, registeredAt: "2024-12-01", paymentMethods: ["MTN MoMo", "Bank Transfer"] },
];

const RECENT_ORDERS: Record<string, RecentOrder[]> = {
  "BUY-001": [
    { orderNumber: "ORD-2025-4871", date: "2026-04-15", total: 12400, status: "confirmed" },
    { orderNumber: "ORD-2025-4820", date: "2026-03-28", total: 8700,  status: "delivered" },
    { orderNumber: "ORD-2025-4790", date: "2026-03-10", total: 15600, status: "delivered" },
  ],
  "BUY-002": [
    { orderNumber: "ORD-2025-4870", date: "2026-04-14", total: 22400, status: "processing" },
    { orderNumber: "ORD-2025-4845", date: "2026-04-01", total: 18200, status: "delivered" },
    { orderNumber: "ORD-2025-4812", date: "2026-03-15", total: 31000, status: "delivered" },
  ],
  "BUY-003": [
    { orderNumber: "ORD-2025-4862", date: "2026-04-10", total: 9100,  status: "shipped" },
    { orderNumber: "ORD-2025-4831", date: "2026-03-22", total: 14800, status: "delivered" },
  ],
  "BUY-005": [
    { orderNumber: "ORD-2025-4833", date: "2026-03-22", total: 6200,  status: "delivered" },
    { orderNumber: "ORD-2025-4801", date: "2026-02-28", total: 8100,  status: "delivered" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const statusConfig: Record<BuyerStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active:      { label: "Active",      color: "var(--success)",      bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending_kyc: { label: "Pending KYC", color: "var(--warning)",      bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  suspended:   { label: "Suspended",   color: "var(--danger)",       bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
  inactive:    { label: "Inactive",    color: "var(--text-tertiary)", bg: "var(--surface-secondary)",                            icon: AlertTriangle },
};

const orderStatusColor: Record<string, string> = {
  confirmed: "var(--indigo)", processing: "var(--amber)", shipped: "var(--indigo)",
  delivered: "var(--success)", pending: "var(--warning)", cancelled: "var(--danger)",
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const buyer = BUYERS.find((b) => b.id === id);
  const recentOrders = RECENT_ORDERS[id] ?? [];

  const [editingLimit, setEditingLimit] = useState(false);
  const [limitValue, setLimitValue] = useState(String(buyer?.creditLimit ?? ""));
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!buyer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <UserCircle2 className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Buyer not found</p>
        <Link href="/admin/buyers" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to buyers</Link>
      </div>
    );
  }

  const status = statusConfig[buyer.status];
  const StatusIcon = status.icon;

  async function handleAction(action: string) {
    setActionLoading(action);
    await new Promise((r) => setTimeout(r, 700));
    setActionLoading(null);
    if (action === "suspend") toast.error("Buyer account suspended");
    else if (action === "reinstate") toast.success("Buyer account reinstated");
    else if (action === "save_limit") { setEditingLimit(false); toast.success("Credit limit updated"); }
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/buyers" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Buyers
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: "color-mix(in srgb, var(--indigo) 12%, transparent)" }}>
            {buyer.countryFlag}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {buyer.companyName}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ color: status.color, background: status.bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {buyer.id} · registered {new Date(buyer.registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total GMV",    value: buyer.totalGMV > 0 ? `$${buyer.totalGMV.toLocaleString()}` : "—", icon: TrendingUp,      accent: "var(--amber)" },
          { label: "Total Orders", value: String(buyer.totalOrders),                                          icon: ShoppingCart,    accent: "var(--indigo)" },
          { label: "Last Order",   value: buyer.lastOrderDate,                                                icon: CreditCardIcon,  accent: "var(--success)" },
        ].map((k) => (
          <div key={k.label} className="p-5 rounded-2xl border" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in srgb, ${k.accent} 12%, transparent)` }}>
              <k.icon className="w-4 h-4" style={{ color: k.accent }} />
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{k.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: contact + account + actions */}
        <div className="space-y-5">
          {/* Contact */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Contact</h2>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Primary Contact</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{buyer.contactName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{buyer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{buyer.city}, {buyer.country}</span>
            </div>
          </div>

          {/* Account */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Account</h2>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Credit Limit</p>
              {editingLimit ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl overflow-hidden flex-1" style={{ border: "1px solid var(--border-subtle)", background: "var(--surface-secondary)" }}>
                    <span className="px-3 py-2 text-sm border-r" style={{ color: "var(--text-tertiary)", borderColor: "var(--border-subtle)" }}>$</span>
                    <input
                      type="number" value={limitValue} onChange={(e) => setLimitValue(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-transparent outline-none" style={{ color: "var(--text-primary)" }} autoFocus
                    />
                  </div>
                  <button onClick={() => handleAction("save_limit")} disabled={!!actionLoading}
                    className="p-2 rounded-lg" style={{ background: "var(--success)", color: "white" }}>
                    {actionLoading === "save_limit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {buyer.creditLimit ? `$${buyer.creditLimit.toLocaleString()}` : "None"}
                  </span>
                  <button onClick={() => setEditingLimit(true)} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Payment Methods</p>
              {buyer.paymentMethods.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {buyer.paymentMethods.map((m) => (
                    <span key={m} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>{m}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>None added yet</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>
            {buyer.status === "pending_kyc" && (
              <Link href="/admin/verification"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "color-mix(in srgb, var(--warning) 10%, transparent)", color: "var(--warning)", border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)" }}>
                Review KYC <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            {buyer.status === "suspended" ? (
              <button onClick={() => handleAction("reinstate")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--success)", color: "white" }}>
                {actionLoading === "reinstate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Reinstate Account
              </button>
            ) : buyer.status === "active" ? (
              <button onClick={() => handleAction("suspend")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                {actionLoading === "suspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Suspend Account
              </button>
            ) : null}
          </div>
        </div>

        {/* Right: recent orders */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Recent Orders</h2>
              </div>
              <Link href="/admin/orders" className="text-xs font-semibold" style={{ color: "var(--amber)" }}>View all →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ShoppingCart className="w-10 h-10 mb-3" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No orders yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Order", "Date", "Amount", "Status", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.orderNumber}
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3.5"><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{o.orderNumber}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{new Date(o.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>${o.total.toLocaleString()}</span></td>
                      <td className="px-5 py-3.5"><span className="text-xs font-semibold capitalize" style={{ color: orderStatusColor[o.status] ?? "var(--text-secondary)" }}>{o.status}</span></td>
                      <td className="px-5 py-3.5">
                        <Link href="/admin/orders" className="p-1.5 rounded-lg block" style={{ color: "var(--text-tertiary)" }}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
