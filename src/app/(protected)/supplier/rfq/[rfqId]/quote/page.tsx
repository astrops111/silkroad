"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Send,
  Save,
  Plus,
  Trash2,
  FileText,
  Clock,
  MapPin,
  Package,
  Calculator,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface RFQSummary {
  id: string;
  rfq_number: string;
  title: string;
  description?: string;
  buyer_company_name: string;
  buyer_country?: string;
  quantity: number;
  unit: string;
  target_price?: number;
  currency: string;
  category?: string;
  deadline: string;
  required_by?: string;
  sample_required?: boolean;
}

interface QuoteLineItem {
  product_name: string;
  quantity: string;
  unit_price: string;
}

const PAYMENT_TERMS = [
  { value: "immediate", label: "Immediate" },
  { value: "net_30", label: "Net 30 days" },
  { value: "net_60", label: "Net 60 days" },
];

const TRADE_TERMS = [
  { value: "FOB", label: "FOB (Free on Board)" },
  { value: "CIF", label: "CIF (Cost, Insurance & Freight)" },
  { value: "EXW", label: "EXW (Ex Works)" },
  { value: "DDP", label: "DDP (Delivered Duty Paid)" },
];

const CURRENCIES = ["USD", "GHS", "KES", "NGN", "ZAR", "CNY"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SubmitQuotePage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.rfqId as string;

  const [rfq, setRfq] = useState<RFQSummary | null>(null);
  const [loadingRfq, setLoadingRfq] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    total_amount: "",
    currency: "USD",
    payment_terms: "net_30",
    trade_term: "FOB",
    lead_time_days: "",
    validity_days: "30",
    moq: "",
    shipping_cost: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);

  /* Fetch the RFQ details */
  useEffect(() => {
    async function load() {
      setLoadingRfq(true);
      try {
        const res = await fetch(`/api/rfqs/${rfqId}`);
        if (res.ok) {
          const data = await res.json();
          setRfq(data.rfq ?? data);
          if (data.rfq?.currency || data.currency) {
            setForm((prev) => ({
              ...prev,
              currency: data.rfq?.currency ?? data.currency ?? prev.currency,
            }));
          }
        }
      } catch {
        /* network error */
      } finally {
        setLoadingRfq(false);
      }
    }
    if (rfqId) load();
  }, [rfqId]);

  /* Auto-calculate total from line items */
  const lineTotal = useMemo(() => {
    return lineItems.reduce((sum, li) => {
      const qty = parseFloat(li.quantity) || 0;
      const price = parseFloat(li.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  }, [lineItems]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { product_name: "", quantity: "", unit_price: "" },
    ]);
  }

  function updateLineItem(
    index: number,
    field: keyof QuoteLineItem,
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(submit: boolean) {
    const totalAmount =
      parseFloat(form.total_amount) || (lineTotal > 0 ? lineTotal : 0);
    if (!totalAmount && submit) return;

    setSubmitting(true);
    try {
      const body = {
        rfq_id: rfqId,
        total_amount: totalAmount,
        currency: form.currency,
        payment_terms: form.payment_terms,
        trade_term: form.trade_term,
        lead_time_days: form.lead_time_days
          ? parseInt(form.lead_time_days)
          : undefined,
        validity_days: parseInt(form.validity_days) || 30,
        moq: form.moq ? parseInt(form.moq) : undefined,
        shipping_cost: form.shipping_cost
          ? parseFloat(form.shipping_cost)
          : undefined,
        notes: form.notes || undefined,
        line_items: lineItems
          .filter((li) => li.product_name && li.quantity && li.unit_price)
          .map((li) => ({
            product_name: li.product_name,
            quantity: parseFloat(li.quantity),
            unit_price: parseFloat(li.unit_price),
          })),
        submit,
      };

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/supplier/rfq");
      }
    } catch {
      /* handled by finally */
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] transition-shadow";
  const labelCls =
    "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";

  if (loadingRfq) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--amber)]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/rfq"
          className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Submit Quotation
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {rfq?.rfq_number ?? "RFQ"} — Provide your best offer
          </p>
        </div>
      </div>

      {/* RFQ Summary */}
      {rfq && (
        <div className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--indigo)]/10 border border-[var(--indigo)]/12 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[var(--indigo)]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--obsidian)] leading-snug">
                  {rfq.title}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {rfq.buyer_company_name}
                  </span>
                  {rfq.category && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--amber)]/10 text-[var(--amber-dark)] text-[10px] font-semibold uppercase">
                      {rfq.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                Deadline
              </div>
              <div className="text-sm font-semibold text-[var(--amber-dark)]">
                {new Date(rfq.deadline).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {rfq.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {rfq.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 text-sm">
              <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-tertiary)]">Qty:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {rfq.quantity.toLocaleString()} {rfq.unit}
              </span>
            </div>
            {rfq.target_price && (
              <div className="flex items-center gap-1.5 text-sm">
                <Calculator className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-tertiary)]">Target:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {rfq.currency} {rfq.target_price.toLocaleString()}
                </span>
              </div>
            )}
            {rfq.sample_required && (
              <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20 uppercase">
                Sample Required
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quotation form */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <Calculator className="w-4 h-4 text-[var(--amber)]" />
          <h2
            className="text-sm font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your Quotation
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Total + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Total Amount <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_amount}
                onChange={(e) => update("total_amount", e.target.value)}
                placeholder={
                  lineTotal > 0 ? lineTotal.toFixed(2) : "0.00"
                }
                className={inputCls}
              />
              {lineTotal > 0 && !form.total_amount && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Auto-calculated from line items: {form.currency}{" "}
                  {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment + Trade terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Payment Terms</label>
              <select
                value={form.payment_terms}
                onChange={(e) => update("payment_terms", e.target.value)}
                className={inputCls}
              >
                {PAYMENT_TERMS.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Trade Term</label>
              <select
                value={form.trade_term}
                onChange={(e) => update("trade_term", e.target.value)}
                className={inputCls}
              >
                {TRADE_TERMS.map((tt) => (
                  <option key={tt.value} value={tt.value}>
                    {tt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead time + Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Lead Time (days)</label>
              <input
                type="number"
                min="1"
                value={form.lead_time_days}
                onChange={(e) => update("lead_time_days", e.target.value)}
                placeholder="e.g. 21"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Validity (days)</label>
              <input
                type="number"
                min="1"
                value={form.validity_days}
                onChange={(e) => update("validity_days", e.target.value)}
                placeholder="30"
                className={inputCls}
              />
            </div>
          </div>

          {/* MOQ + Shipping cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Minimum Order Quantity</label>
              <input
                type="number"
                min="1"
                value={form.moq}
                onChange={(e) => update("moq", e.target.value)}
                placeholder="e.g. 100"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Shipping Cost ({form.currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.shipping_cost}
                onChange={(e) => update("shipping_cost", e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes / Additional Info</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Mention certifications, warranty, delivery terms, or anything else the buyer should know..."
              rows={3}
              className={inputCls + " resize-y"}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <h2
            className="text-sm font-bold text-[var(--obsidian)] flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Plus className="w-4 h-4 text-[var(--amber)]" />
            Line Items
          </h2>
          <button
            type="button"
            onClick={addLineItem}
            className="btn-outline text-xs !px-3 !py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {lineItems.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              Optionally break down your quote into individual line items.
            </p>
            <button
              type="button"
              onClick={addLineItem}
              className="btn-outline text-sm mt-4"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-end gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
              >
                <div className="flex-[2] space-y-1">
                  <label className="text-xs font-medium text-[var(--text-tertiary)]">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={item.product_name}
                    onChange={(e) =>
                      updateLineItem(idx, "product_name", e.target.value)
                    }
                    placeholder="Product name"
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-[var(--text-tertiary)]">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(idx, "quantity", e.target.value)
                    }
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-[var(--text-tertiary)]">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateLineItem(idx, "unit_price", e.target.value)
                    }
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div className="w-20 text-right space-y-1">
                  <label className="text-xs font-medium text-[var(--text-tertiary)] block">
                    Subtotal
                  </label>
                  <div
                    className="text-sm font-semibold text-[var(--obsidian)] py-2.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {(
                      (parseFloat(item.quantity) || 0) *
                      (parseFloat(item.unit_price) || 0)
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLineItem(idx)}
                  className="p-2.5 rounded-lg text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Line total */}
            {lineItems.length > 0 && (
              <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-right">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Line Items Total
                  </span>
                  <div
                    className="text-lg font-bold text-[var(--obsidian)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {form.currency}{" "}
                    {lineTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="btn-outline"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={
            submitting ||
            (!form.total_amount && lineTotal === 0)
          }
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Submit Quotation
        </button>
      </div>
    </div>
  );
}
