"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, UserCircle2, CheckCircle2, Clock, XCircle,
  Mail, MapPin, ShoppingCart, TrendingUp, CreditCard as CreditCardIcon,
  Loader2, Pencil, Save,
} from "lucide-react";
import { toast } from "sonner";

type BuyerStatus = "active" | "pending_kyc" | "suspended";

interface BuyerDetail {
  id: string;
  companyName: string;
  city: string | null;
  countryCode: string;
  isActive: boolean;
  verificationStatus: string | null;
  creditLimit: number | null;
  createdAt: string;
  contact: { full_name: string | null; email: string | null } | null;
  totalOrders: number;
  totalGmv: number;
  lastOrderAt: string | null;
}

function deriveStatus(buyer: BuyerDetail): BuyerStatus {
  if (!buyer.isActive) return "suspended";
  if (buyer.verificationStatus === "pending") return "pending_kyc";
  return "active";
}

const statusConfig: Record<BuyerStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active:      { label: "Active",      color: "var(--success)", bg: "color-mix(in srgb, var(--success) 10%, transparent)", icon: CheckCircle2 },
  pending_kyc: { label: "Pending KYC", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 10%, transparent)", icon: Clock },
  suspended:   { label: "Suspended",   color: "var(--danger)",  bg: "color-mix(in srgb, var(--danger) 10%, transparent)",  icon: XCircle },
};

export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [buyer, setBuyer] = useState<BuyerDetail | null | undefined>(undefined);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitValue, setLimitValue] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/buyers?id=${id}`);
    const data = await res.json();
    const found = data.buyers?.[0] ?? null;
    setBuyer(found);
    if (found) setLimitValue(found.creditLimit != null ? String(found.creditLimit / 100) : "");
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (buyer === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <UserCircle2 className="w-12 h-12" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Buyer not found</p>
        <Link href="/admin/buyers" className="text-sm font-semibold" style={{ color: "var(--amber)" }}>← Back to buyers</Link>
      </div>
    );
  }

  const status = statusConfig[deriveStatus(buyer)];
  const StatusIcon = status.icon;

  async function runAction(action: "suspend" | "reinstate" | "set_credit_limit", creditLimit?: number | null) {
    setActionLoading(action);
    const res = await fetch("/api/admin/buyers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: id, action, creditLimit }),
    });
    const data = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      toast.error(data.error || "Action failed");
      return;
    }
    if (action === "suspend") toast.error("Buyer account suspended");
    else if (action === "reinstate") toast.success("Buyer account reinstated");
    else { setEditingLimit(false); toast.success("Credit limit updated"); }
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/buyers" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: "var(--text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" /> Buyers
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--indigo) 12%, transparent)", color: "var(--indigo)" }}>
            {buyer.countryCode}
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
              registered {new Date(buyer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total GMV",    value: buyer.totalGmv > 0 ? `$${(buyer.totalGmv / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—", icon: TrendingUp,     accent: "var(--amber)" },
          { label: "Total Orders", value: String(buyer.totalOrders),                                                                                        icon: ShoppingCart,   accent: "var(--indigo)" },
          { label: "Last Order",   value: buyer.lastOrderAt ? new Date(buyer.lastOrderAt).toLocaleDateString() : "—",                                       icon: CreditCardIcon, accent: "var(--success)" },
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Contact</h2>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-tertiary)" }}>Primary Contact</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{buyer.contact?.full_name ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{buyer.contact?.email ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{buyer.city ? `${buyer.city}, ` : ""}{buyer.countryCode}</span>
            </div>
          </div>

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
                  <button
                    onClick={() => runAction("set_credit_limit", limitValue ? Math.round(Number(limitValue) * 100) : null)}
                    disabled={!!actionLoading}
                    className="p-2 rounded-lg" style={{ background: "var(--success)", color: "white" }}
                  >
                    {actionLoading === "set_credit_limit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {buyer.creditLimit ? `$${(buyer.creditLimit / 100).toLocaleString()}` : "None"}
                  </span>
                  <button onClick={() => setEditingLimit(true)} className="p-1.5 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-5 space-y-2.5" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Actions</h2>
            {deriveStatus(buyer) === "suspended" ? (
              <button onClick={() => runAction("reinstate")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--success)", color: "white" }}>
                {actionLoading === "reinstate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Reinstate Account
              </button>
            ) : (
              <button onClick={() => runAction("suspend")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                {actionLoading === "suspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Suspend Account
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Orders</h2>
              </div>
              <Link href={`/admin/orders?buyerCompanyId=${buyer.id}`} className="text-xs font-semibold" style={{ color: "var(--amber)" }}>View all →</Link>
            </div>
            <div className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="w-10 h-10 mb-3" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                {buyer.totalOrders > 0 ? `${buyer.totalOrders} total orders — see the orders list for details` : "No orders yet"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
