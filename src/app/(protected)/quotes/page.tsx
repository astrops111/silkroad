"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, Package } from "lucide-react";

type QuoteStatus = "submitted" | "calculating" | "ready" | "accepted" | "paid" | "expired" | "cancelled";

interface QuoteSummary {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  destination_country: string;
  destination_city: string | null;
  shipping_mode: string;
  incoterms: string;
  product_subtotal: number | null;
  total_amount: number | null;
  currency: string;
  expires_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: typeof Clock }> = {
  submitted:   { label: "Submitted",   color: "text-blue-600 bg-blue-50",           icon: Clock },
  calculating: { label: "Calculating", color: "text-amber-600 bg-amber-50",          icon: Clock },
  ready:       { label: "Ready",       color: "text-green-700 bg-green-50",          icon: CheckCircle2 },
  accepted:    { label: "Accepted",    color: "text-green-700 bg-green-50",          icon: CheckCircle2 },
  paid:        { label: "Paid",        color: "text-green-700 bg-green-100",         icon: CheckCircle2 },
  expired:     { label: "Expired",     color: "text-[var(--text-tertiary)] bg-[var(--surface-secondary)]", icon: XCircle },
  cancelled:   { label: "Cancelled",   color: "text-[var(--danger)] bg-red-50",      icon: XCircle },
};

const SHIPPING_LABELS: Record<string, string> = {
  lcl:         "LCL (Shared Container)",
  fcl_20:      "FCL 20'",
  fcl_40:      "FCL 40'",
  fcl_40hc:    "FCL 40' HC",
  air_express: "Air Express",
  air_freight: "Air Freight",
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((d) => setQuotes(d.quotes ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)]">
      <div className="max-w-[900px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
              My Quotes
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Platform calculates full landed cost — shipping, customs, duties included.
            </p>
          </div>
          <Link href="/marketplace" className="btn-outline text-sm">
            Browse Products
          </Link>
        </div>

        {loading && (
          <div className="text-center py-20 text-[var(--text-tertiary)]">Loading…</div>
        )}

        {!loading && quotes.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No quotes yet</h2>
            <p className="text-[var(--text-secondary)] mb-6 text-sm">
              Add products to your cart and request a shipping + landed cost quote.
            </p>
            <Link href="/marketplace" className="btn-primary">Start Shopping</Link>
          </div>
        )}

        {!loading && quotes.length > 0 && (
          <div className="space-y-4">
            {quotes.map((q) => {
              const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.submitted;
              const StatusIcon = cfg.icon;
              return (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="block bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 hover:border-[var(--amber)] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[var(--amber-dark)] flex-shrink-0" />
                      <div>
                        <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                          {q.quote_number}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                          {new Date(q.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--text-tertiary)] text-xs">Destination</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {q.destination_city ? `${q.destination_city}, ` : ""}{q.destination_country}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)] text-xs">Shipping Mode</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {SHIPPING_LABELS[q.shipping_mode] ?? q.shipping_mode}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)] text-xs">Goods Value</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {q.product_subtotal != null
                          ? `${q.currency} ${(q.product_subtotal / 100).toFixed(2)}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)] text-xs">Total (landed)</p>
                      <p className={`font-bold ${q.total_amount ? "text-[var(--amber-dark)]" : "text-[var(--text-tertiary)]"}`}>
                        {q.total_amount != null
                          ? `${q.currency} ${(q.total_amount / 100).toFixed(2)}`
                          : "Pending calculation"}
                      </p>
                    </div>
                  </div>

                  {q.status === "ready" && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
                      <AlertCircle className="w-4 h-4" />
                      Quote ready — click to review and pay
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--amber-dark)] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
