"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  FileText,
  Clock,
  MessageSquareQuote,
  MapPin,
  Tag,
  Calendar,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  target_price?: number;
  currency: string;
  buyer_company_name: string;
  buyer_country?: string;
  quotation_count: number;
  deadline: string;
  required_by?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function daysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function countryFlag(code?: string): string {
  if (!code) return "";
  const clean = code.trim().toUpperCase();
  /* Map common country names to ISO codes */
  const MAP: Record<string, string> = {
    GHANA: "GH", KENYA: "KE", NIGERIA: "NG", "SOUTH AFRICA": "ZA",
    CHINA: "CN", USA: "US", UK: "GB", TANZANIA: "TZ", UGANDA: "UG",
    ETHIOPIA: "ET", SENEGAL: "SN", CAMEROON: "CM", EGYPT: "EG",
    MOROCCO: "MA", IVORY: "CI", RWANDA: "RW",
  };
  const iso = MAP[clean] ?? (clean.length === 2 ? clean : "");
  if (!iso) return "";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SupplierRFQMarketplace() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/rfqs?supplierView=true");
        if (res.ok) {
          const data = await res.json();
          setRfqs(data.rfqs ?? data ?? []);
        }
      } catch {
        /* network error */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = rfqs.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q) ||
      r.buyer_company_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Open RFQ Marketplace
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Browse requests from buyers and submit your best quotation
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] focus-within:border-[var(--amber)] focus-within:ring-2 focus-within:ring-[var(--amber)]/20 transition-all">
        <Search className="w-4.5 h-4.5 text-[var(--text-tertiary)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, category, or buyer..."
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--amber)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-[var(--amber)]/10 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-[var(--amber)]" />
          </div>
          <h3
            className="text-lg font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            No open RFQs at the moment
          </h3>
          <p className="text-sm text-[var(--text-tertiary)] mt-1 max-w-sm">
            Check back soon. Buyers are constantly posting new requests for
            quotation.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rfq) => {
            const remaining = daysLeft(rfq.deadline);
            const urgent = remaining <= 3;
            const flag = countryFlag(rfq.buyer_country);

            return (
              <div
                key={rfq.id}
                className="card-elevated flex flex-col"
              >
                <div className="p-5 flex-1 space-y-3">
                  {/* Category tag + deadline */}
                  <div className="flex items-center justify-between">
                    {rfq.category ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[var(--amber-dark)] bg-[var(--amber)]/10 rounded-full border border-[var(--amber)]/15 uppercase tracking-wider">
                        <Tag className="w-3 h-3" />
                        {rfq.category}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        urgent
                          ? "text-[var(--danger)]"
                          : "text-[var(--amber-dark)]"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {remaining === 0 ? "Closing today" : `${remaining}d left`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-semibold text-[var(--obsidian)] leading-snug line-clamp-2">
                    {rfq.title}
                  </h3>

                  {/* Buyer */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {rfq.buyer_company_name}
                      {flag && ` ${flag}`}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div>
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                        Quantity
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {rfq.quantity.toLocaleString()} {rfq.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                        Target Price
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {rfq.target_price
                          ? `${rfq.currency} ${rfq.target_price.toLocaleString()}`
                          : "Open"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                        Quotes
                      </div>
                      <div className="text-sm font-semibold text-[var(--indigo)] flex items-center gap-1">
                        <MessageSquareQuote className="w-3.5 h-3.5" />
                        {rfq.quotation_count}
                      </div>
                    </div>
                    {rfq.required_by && (
                      <div>
                        <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                          Deliver By
                        </div>
                        <div className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(rfq.required_by).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="px-5 pb-5">
                  <Link
                    href={`/supplier/rfq/${rfq.id}/quote`}
                    className="btn-primary w-full text-center text-sm"
                  >
                    Submit Quote
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
