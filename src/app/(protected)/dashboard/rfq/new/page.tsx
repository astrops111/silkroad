"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Send,
  Save,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface LineItem {
  product_name: string;
  quantity: string;
  unit: string;
  target_unit_price: string;
}

const UNITS = ["pieces", "kg", "tons", "meters", "cartons"];
const CURRENCIES = ["USD", "GHS", "KES", "NGN", "ZAR", "CNY"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function NewRFQPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    quantity: "",
    unit: "pieces",
    target_price: "",
    currency: "USD",
    delivery_country: "",
    delivery_city: "",
    required_by: "",
    deadline: "",
    sample_required: false,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { product_name: "", quantity: "", unit: "pieces", target_unit_price: "" },
    ]);
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(publish: boolean) {
    if (!form.title.trim() || !form.quantity) return;
    setSubmitting(true);

    try {
      const body = {
        title: form.title,
        description: form.description || undefined,
        category: form.category || undefined,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        target_price: form.target_price
          ? parseFloat(form.target_price)
          : undefined,
        currency: form.currency,
        delivery_country: form.delivery_country || undefined,
        delivery_city: form.delivery_city || undefined,
        required_by: form.required_by || undefined,
        deadline: form.deadline || undefined,
        sample_required: form.sample_required,
        line_items: lineItems
          .filter((li) => li.product_name && li.quantity)
          .map((li) => ({
            product_name: li.product_name,
            quantity: parseFloat(li.quantity),
            unit: li.unit,
            target_unit_price: li.target_unit_price
              ? parseFloat(li.target_unit_price)
              : undefined,
          })),
        publish,
      };

      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/dashboard/rfq");
      }
    } catch {
      /* handled by finally */
    } finally {
      setSubmitting(false);
    }
  }

  /* shared input classes */
  const inputCls =
    "w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] transition-shadow";
  const labelCls = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/rfq"
          className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Create New RFQ
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Describe what you need and let suppliers compete for your business
          </p>
        </div>
      </div>

      {/* Main form card */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <FileText className="w-4 h-4 text-[var(--amber)]" />
          <h2
            className="text-sm font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            RFQ Details
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className={labelCls}>
              Title <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. 500 units of Solar Panels 550W"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Provide detailed specifications, quality requirements, certifications needed..."
              rows={4}
              className={inputCls + " resize-y"}
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="e.g. Solar Energy, Electronics, Agriculture"
              className={inputCls}
            />
          </div>

          {/* Quantity + Unit row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Quantity <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                placeholder="500"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
                className={inputCls}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target price + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Target Price (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.target_price}
                onChange={(e) => update("target_price", e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
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

          {/* Delivery location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Delivery Country</label>
              <input
                type="text"
                value={form.delivery_country}
                onChange={(e) => update("delivery_country", e.target.value)}
                placeholder="e.g. Ghana"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Delivery City</label>
              <input
                type="text"
                value={form.delivery_city}
                onChange={(e) => update("delivery_city", e.target.value)}
                placeholder="e.g. Accra"
                className={inputCls}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Required By</label>
              <input
                type="date"
                value={form.required_by}
                onChange={(e) => update("required_by", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Quotation Deadline</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Sample required */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sample_required"
              checked={form.sample_required}
              onChange={(e) => update("sample_required", e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--amber)] focus:ring-[var(--amber)] accent-[var(--amber)]"
            />
            <label
              htmlFor="sample_required"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              Sample required before order
            </label>
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
              No line items yet. Add individual products to your RFQ for
              itemized quotes.
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
                    Unit
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) =>
                      updateLineItem(idx, "unit", e.target.value)
                    }
                    className={inputCls}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-[var(--text-tertiary)]">
                    Target Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.target_unit_price}
                    onChange={(e) =>
                      updateLineItem(idx, "target_unit_price", e.target.value)
                    }
                    placeholder="0.00"
                    className={inputCls}
                  />
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
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={submitting || !form.title.trim() || !form.quantity}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Publish RFQ
        </button>
      </div>
    </div>
  );
}
