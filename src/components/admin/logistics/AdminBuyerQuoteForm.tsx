"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Package, Ship, FileText, CheckCircle2,
  Loader2, AlertCircle, Save, Send, Clock, XCircle,
} from "lucide-react";

interface QuoteItem {
  productId?: string;
  productName?: string;
  supplierName?: string;
  variantName?: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
}

interface BuyerProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  buyer_company_name: string | null;
  buyer_tax_id: string | null;
  items: QuoteItem[];
  destination_country: string;
  destination_city: string | null;
  shipping_mode: string;
  incoterms: string;
  cargo_ready_date: string | null;
  buyer_notes: string | null;
  admin_notes: string | null;
  product_subtotal: number | null;
  shipping_cost: number | null;
  customs_duties: number | null;
  platform_fee: number | null;
  total_amount: number | null;
  currency: string;
  origin_country: string | null;
  estimated_transit_days: number | null;
  expires_at: string | null;
  created_at: string;
  user_profiles: BuyerProfile | null;
}

const SHIPPING_LABELS: Record<string, string> = {
  lcl: "LCL (Shared Container)", fcl_20: "FCL 20'", fcl_40: "FCL 40'",
  fcl_40hc: "FCL 40' HC", air_express: "Air Express", air_freight: "Air Freight",
};

function usdField(minor: number | null | undefined) {
  if (minor == null) return "";
  return (minor / 100).toFixed(2);
}

function toMinor(val: string): number {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function AdminBuyerQuoteForm({ quote }: { quote: Quote }) {
  const router = useRouter();
  const buyer = quote.user_profiles;

  const [shippingCost, setShippingCost]   = useState(usdField(quote.shipping_cost));
  const [customsDuties, setCustomsDuties] = useState(usdField(quote.customs_duties));
  const [platformFee, setPlatformFee]     = useState(usdField(quote.platform_fee));
  const [transitDays, setTransitDays]     = useState(quote.estimated_transit_days?.toString() ?? "");
  const [originCountry, setOriginCountry] = useState(quote.origin_country ?? "CN");
  const [adminNotes, setAdminNotes]       = useState(quote.admin_notes ?? "");
  const [validityDays, setValidityDays]   = useState("7");
  const [currency, setCurrency]           = useState(quote.currency ?? "USD");

  const [saving, setSaving]       = useState(false);
  const [sending, setSending]     = useState(false);
  const [marking, setMarking]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);
  const [currentStatus, setCurrentStatus] = useState(quote.status);

  const goodsMinor    = quote.product_subtotal ?? 0;
  const shippingMinor = toMinor(shippingCost);
  const customsMinor  = toMinor(customsDuties);
  const platformMinor = toMinor(platformFee);
  const totalMinor    = goodsMinor + shippingMinor + customsMinor + platformMinor;

  function fmt(minor: number) {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }

  async function save(sendToReady = false) {
    const setter = sendToReady ? setSending : setSaving;
    setter(true);
    setError(null);
    setSaved(false);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(validityDays || "7", 10));

    const body = {
      shipping_cost:          shippingMinor || null,
      customs_duties:         customsMinor  || null,
      platform_fee:           platformMinor || null,
      total_amount:           totalMinor    || null,
      currency,
      origin_country:         originCountry || null,
      estimated_transit_days: transitDays ? parseInt(transitDays, 10) : null,
      admin_notes:            adminNotes || null,
      expires_at:             expiresAt.toISOString(),
      status:                 sendToReady ? "ready" : undefined,
      cost_components: {
        currency,
        goods:       { amountMinor: goodsMinor },
        mainLeg:     shippingMinor ? { amountMinor: shippingMinor } : undefined,
        duty:        customsMinor  ? { amountMinor: customsMinor }  : undefined,
        markupMinor: platformMinor || undefined,
        totalMinor:  totalMinor    || undefined,
      },
    };

    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      if (sendToReady) router.push("/admin/logistics/buyer-quotes");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setter(false);
    }
  }

  async function markStatus(newStatus: string) {
    setMarking(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed");
      setCurrentStatus(newStatus);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMarking(false);
    }
  }

  const canSend = !!totalMinor && !["ready", "accepted", "paid"].includes(currentStatus);

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/logistics/buyer-quotes" className="text-[var(--text-tertiary)] hover:text-[var(--obsidian)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--obsidian)] font-mono">{quote.quote_number}</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {buyer?.full_name ?? buyer?.email ?? "Unknown buyer"}
            {buyer?.email && buyer.full_name && <span className="ml-2 text-[var(--text-tertiary)]">· {buyer.email}</span>}
            {buyer?.phone && <span className="ml-2 text-[var(--text-tertiary)]">· {buyer.phone}</span>}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${
          currentStatus === "submitted"   ? "text-blue-700 bg-blue-50 border-blue-200" :
          currentStatus === "calculating" ? "text-amber-700 bg-amber-50 border-amber-200" :
          currentStatus === "ready"       ? "text-green-700 bg-green-50 border-green-200" :
          currentStatus === "accepted"    ? "text-green-700 bg-green-100 border-green-300" :
          currentStatus === "paid"        ? "text-green-800 bg-green-200 border-green-400" :
          "text-gray-600 bg-gray-50 border-gray-200"
        }`}>
          {currentStatus}
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Buyer request info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border-subtle)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Ship className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-semibold text-[var(--obsidian)] text-sm">Buyer Request</h2>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-[var(--text-tertiary)]">Route</dt>
                <dd className="font-medium">{originCountry} → {quote.destination_country}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-tertiary)]">City / Port</dt>
                <dd className="font-medium">{quote.destination_city ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-tertiary)]">Mode</dt>
                <dd className="font-medium">{SHIPPING_LABELS[quote.shipping_mode] ?? quote.shipping_mode}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-tertiary)]">Incoterms</dt>
                <dd className="font-medium uppercase">{quote.incoterms}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-tertiary)]">Cargo Ready</dt>
                <dd className="font-medium">{quote.cargo_ready_date ?? "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-tertiary)]">Submitted</dt>
                <dd className="font-medium">{new Date(quote.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
            {quote.buyer_notes && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Buyer notes</p>
                <p className="text-sm text-[var(--text-secondary)]">{quote.buyer_notes}</p>
              </div>
            )}
            {(quote.buyer_company_name || quote.buyer_tax_id) && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Invoice info</p>
                {quote.buyer_company_name && <p className="text-sm font-medium">{quote.buyer_company_name}</p>}
                {quote.buyer_tax_id && <p className="text-sm text-[var(--text-secondary)]">Tax ID: {quote.buyer_tax_id}</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[var(--border-subtle)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-semibold text-[var(--obsidian)] text-sm">Items ({quote.items.length})</h2>
              <span className="ml-auto text-sm font-bold text-[var(--obsidian)]">{fmt(goodsMinor)}</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {quote.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-[var(--obsidian)]">{item.productName ?? "Product"}</p>
                    {item.variantName && <p className="text-xs text-[var(--text-tertiary)]">{item.variantName}</p>}
                    {item.supplierName && <p className="text-xs text-[var(--text-tertiary)]">Supplier: {item.supplierName}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmt((item.unitPrice ?? 0) * (item.quantity ?? 1))}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Cost entry */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--border-subtle)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-semibold text-[var(--obsidian)] text-sm">Cost Entry</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]">
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Goods value (auto)</label>
                <input readOnly value={usdField(goodsMinor)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm bg-[var(--surface-secondary)] text-[var(--text-tertiary)] cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Shipping &amp; freight ({currency})</label>
                <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Customs duties + VAT ({currency})</label>
                <input type="number" min="0" step="0.01" value={customsDuties} onChange={(e) => setCustomsDuties(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Platform fee ({currency})</label>
                <input type="number" min="0" step="0.01" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
              </div>

              <div className="flex items-center justify-between px-3 py-3 rounded-lg bg-[var(--obsidian)] text-white">
                <span className="text-sm font-semibold">Total Landed Cost</span>
                <span className="text-xl font-bold font-mono">{fmt(totalMinor)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1">Origin country</label>
                  <input type="text" maxLength={2} value={originCountry} onChange={(e) => setOriginCountry(e.target.value.toUpperCase())}
                    placeholder="CN"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1">Transit days</label>
                  <input type="number" min="1" value={transitDays} onChange={(e) => setTransitDays(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Quote valid for (days)</label>
                <input type="number" min="1" max="30" value={validityDays} onChange={(e) => setValidityDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Notes for buyer</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3}
                  placeholder="Carrier, vessel name, special conditions, etc."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--obsidian)]" />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {saved && !error && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Saved successfully
            </div>
          )}

          {/* Status quick-actions */}
          {currentStatus === "submitted" && (
            <button
              onClick={() => markStatus("calculating")}
              disabled={marking}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Mark as Calculating
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => save(false)}
              disabled={saving || sending || marking || currentStatus === "paid"}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border-default)] bg-white text-sm font-semibold text-[var(--obsidian)] hover:bg-[var(--surface-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving || sending || marking || !canSend}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--obsidian)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {["ready", "accepted", "paid"].includes(currentStatus) ? "Already Sent" : "Send to Buyer"}
            </button>
          </div>

          {["ready", "accepted"].includes(currentStatus) && (
            <p className="text-xs text-center text-[var(--text-tertiary)]">
              Quote already sent. Use Save Draft to update without changing status.
            </p>
          )}

          {!["paid", "cancelled", "expired"].includes(currentStatus) && (
            <button
              onClick={() => markStatus("cancelled")}
              disabled={marking || saving || sending}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel this quote
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
