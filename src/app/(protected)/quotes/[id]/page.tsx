"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Clock, XCircle, Package,
  Ship, FileText, Loader2, AlertCircle,
} from "lucide-react";

interface CostComponents {
  currency?: string;
  goods?: { amountMinor: number };
  mainLeg?: { amountMinor: number };
  firstMile?: { amountMinor: number };
  lastMile?: { amountMinor: number };
  insurance?: { amountMinor: number; notes?: string };
  duty?: { amountMinor: number };
  vat?: { amountMinor: number };
  excise?: { amountMinor: number };
  otherFees?: { amountMinor: number };
  handling?: { amountMinor: number };
  markupMinor?: number;
  totalMinor?: number;
  warnings?: string[];
}

interface QuoteItem {
  productId?: string;
  productName?: string;
  supplierName?: string;
  variantName?: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
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
  cost_components: CostComponents | null;
  product_subtotal: number | null;
  shipping_cost: number | null;
  customs_duties: number | null;
  platform_fee: number | null;
  total_amount: number | null;
  currency: string;
  origin_country: string | null;
  estimated_transit_days: number | null;
  expires_at: string | null;
  purchase_order_id: string | null;
  created_at: string;
}

const SHIPPING_LABELS: Record<string, string> = {
  lcl: "LCL (Shared Container)", fcl_20: "FCL 20'", fcl_40: "FCL 40'",
  fcl_40hc: "FCL 40' HC", air_express: "Air Express", air_freight: "Air Freight",
};

function fmt(minor: number | null | undefined, currency: string) {
  if (minor == null) return "—";
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    submitted:   { label: "Submitted",    color: "text-blue-600 bg-blue-50 border-blue-200" },
    calculating: { label: "Calculating",  color: "text-amber-600 bg-amber-50 border-amber-200" },
    ready:       { label: "Ready to Pay", color: "text-green-700 bg-green-50 border-green-200" },
    accepted:    { label: "Accepted",     color: "text-green-700 bg-green-50 border-green-200" },
    paid:        { label: "Paid",         color: "text-green-700 bg-green-100 border-green-300" },
    expired:     { label: "Expired",      color: "text-gray-500 bg-gray-50 border-gray-200" },
    cancelled:   { label: "Cancelled",    color: "text-red-600 bg-red-50 border-red-200" },
  };
  const { label, color } = map[status] ?? map.submitted;
  return (
    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then((r) => r.json())
      .then((d) => setQuote(d.quote ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAccept = async () => {
    if (!quote) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to accept quote");
      router.push(`/quotes/${id}/pay?orderId=${data.orderId}`);
    } catch (e) {
      setError((e as Error).message);
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--amber)]" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-[var(--danger)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Quote not found</h2>
          <Link href="/quotes" className="btn-outline mt-4 inline-block">Back to Quotes</Link>
        </div>
      </div>
    );
  }

  const cc = quote.cost_components;
  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date();
  const isReady = quote.status === "ready" && !isExpired;
  const canGoToPay = (quote.status === "accepted") && quote.purchase_order_id;

  const costRows: { label: string; minor: number | null | undefined; note?: string }[] = cc
    ? [
        { label: "Goods value",         minor: cc.goods?.amountMinor },
        { label: "First mile",          minor: cc.firstMile?.amountMinor },
        { label: "Ocean / Air freight", minor: cc.mainLeg?.amountMinor },
        { label: "Insurance",           minor: cc.insurance?.amountMinor, note: cc.insurance?.notes },
        { label: "Customs duty",        minor: cc.duty?.amountMinor },
        { label: "VAT / Tax",           minor: cc.vat?.amountMinor },
        { label: "Excise",              minor: cc.excise?.amountMinor },
        { label: "Other fees",          minor: cc.otherFees?.amountMinor },
        { label: "Last mile delivery",  minor: cc.lastMile?.amountMinor },
        { label: "Platform handling",   minor: cc.handling?.amountMinor },
        { label: "Platform fee",        minor: cc.markupMinor },
      ].filter((r) => (r.minor ?? 0) > 0)
    : [];

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)]">
      <div className="max-w-[800px] mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/quotes" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-mono">{quote.quote_number}</h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              Submitted {new Date(quote.created_at).toLocaleDateString(undefined, { dateStyle: "long" })}
            </p>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        {/* Status banners */}
        {quote.status === "submitted" && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Quote under review</p>
              <p className="text-blue-700 text-xs mt-0.5">
                Our logistics team is calculating your full landed cost — shipping, customs, and duties.
                You will receive an update within 1–2 business days.
              </p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Quote ready — full landed cost calculated</p>
              <p className="text-green-700 text-xs mt-0.5">
                Review the breakdown below, then click <strong>Accept &amp; Pay</strong> to proceed.
                {quote.expires_at && (
                  <> Quote valid until {new Date(quote.expires_at).toLocaleDateString(undefined, { dateStyle: "long" })}.</>
                )}
              </p>
            </div>
          </div>
        )}

        {quote.status === "ready" && isExpired && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm">This quote has expired. Please submit a new cart request.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {/* Shipment summary */}
        <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="w-5 h-5 text-[var(--amber-dark)]" />
            <h2 className="font-bold text-[var(--text-primary)]">Shipment Details</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Route</p>
              <p className="font-medium text-[var(--text-primary)]">
                {quote.origin_country ?? "CN"} → {quote.destination_city ? `${quote.destination_city}, ` : ""}
                {quote.destination_country}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Shipping Mode</p>
              <p className="font-medium text-[var(--text-primary)]">
                {SHIPPING_LABELS[quote.shipping_mode] ?? quote.shipping_mode}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Incoterms</p>
              <p className="font-medium text-[var(--text-primary)] uppercase">{quote.incoterms}</p>
            </div>
            {quote.estimated_transit_days && (
              <div>
                <p className="text-[var(--text-tertiary)] text-xs">Estimated Transit</p>
                <p className="font-medium text-[var(--text-primary)]">{quote.estimated_transit_days} days</p>
              </div>
            )}
          </div>
          {quote.admin_notes && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Note from logistics team</p>
              <p className="text-sm text-[var(--text-secondary)]">{quote.admin_notes}</p>
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        {cc && costRows.length > 0 && (
          <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[var(--amber-dark)]" />
              <h2 className="font-bold text-[var(--text-primary)]">Cost Breakdown</h2>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)]">
              {costRows.map(({ label, minor, note }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 bg-[var(--surface-primary)]">
                  <div>
                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                    {note && <p className="text-xs text-[var(--text-tertiary)]">{note}</p>}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] font-mono">
                    {fmt(minor, quote.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-4 mt-3 rounded-xl bg-[var(--amber)]/5 border border-[var(--amber)]/30">
              <span className="font-bold text-[var(--text-primary)]">Total Landed Cost</span>
              <span className="text-2xl font-bold text-[var(--amber-dark)] font-mono">
                {fmt(quote.total_amount, quote.currency)}
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              All amounts in {quote.currency}.
              {quote.expires_at && (
                <> Valid until {new Date(quote.expires_at).toLocaleDateString(undefined, { dateStyle: "long" })}.</>
              )}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[var(--amber-dark)]" />
            <h2 className="font-bold text-[var(--text-primary)]">Items ({quote.items.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {quote.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-3">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{item.productName ?? "Product"}</p>
                  {item.variantName && <p className="text-xs text-[var(--text-tertiary)]">{item.variantName}</p>}
                  {item.supplierName && <p className="text-xs text-[var(--text-tertiary)]">Supplier: {item.supplierName}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {fmt((item.unitPrice ?? 0) * (item.quantity ?? 1), item.currency ?? quote.currency)}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {isReady && (
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="btn-primary flex-1 !py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {accepting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating order…</>
                : <><CheckCircle2 className="w-5 h-5" /> Accept Quote &amp; Pay</>}
            </button>
            <Link href="/quotes" className="btn-outline px-6">Back</Link>
          </div>
        )}

        {canGoToPay && (
          <div className="flex gap-3">
            <Link
              href={`/quotes/${id}/pay?orderId=${quote.purchase_order_id}`}
              className="btn-primary flex-1 text-center !py-4 text-base"
            >
              Go to Payment
            </Link>
            <Link href="/quotes" className="btn-outline px-6">Back</Link>
          </div>
        )}

        {(quote.status === "submitted" || quote.status === "calculating") && (
          <Link href="/quotes" className="btn-outline">Back to Quotes</Link>
        )}
      </div>
    </div>
  );
}
