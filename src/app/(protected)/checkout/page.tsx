"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/stores/cart";
import {
  ArrowLeft, Ship, Shield, Loader2, CheckCircle2,
  Package, Minus, Plus, Trash2, Truck, FileText,
} from "lucide-react";

type Step = "cart" | "quote_form" | "submitted";

const SHIPPING_MODES = [
  { value: "lcl",         label: "LCL — Shared Container",      note: "Best for smaller shipments" },
  { value: "fcl_20",      label: "FCL 20' Container",           note: "Up to ~25 CBM / 20t" },
  { value: "fcl_40",      label: "FCL 40' Container",           note: "Up to ~55 CBM / 26t" },
  { value: "fcl_40hc",    label: "FCL 40' High Cube",           note: "Up to ~68 CBM / 26t" },
  { value: "air_express", label: "Air Express",                  note: "1–5 days, premium rate" },
  { value: "air_freight", label: "Air Freight",                  note: "2–7 days" },
];

const INCOTERMS = [
  { value: "ddp", label: "DDP — Delivered Duty Paid",  note: "Platform handles everything to your door" },
  { value: "dap", label: "DAP — Delivered at Place",   note: "You handle import duties" },
  { value: "cif", label: "CIF — Cost, Insurance, Freight", note: "You handle clearance and last mile" },
  { value: "fob", label: "FOB — Free on Board",        note: "You handle freight from origin port" },
  { value: "exw", label: "EXW — Ex Works",             note: "You handle all logistics" },
];

const DESTINATION_COUNTRIES = [
  "NG", "GH", "KE", "TZ", "ZA", "ET", "EG", "CM", "CI", "SN", "UG", "ZM", "CD", "MA",
  "MZ", "RW", "BJ", "AO", "MW", "ZW",
].map((code) => ({ code, name: new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getItemsBySupplier, getTotal, updateQuantity, removeItem, clearCart } = useCartStore();
  const [step, setStep] = useState<Step>("cart");

  // Quote form fields
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [shippingMode, setShippingMode] = useState("lcl");
  const [incoterms, setIncoterms] = useState("ddp");
  const [cargoReadyDate, setCargoReadyDate] = useState("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuoteNumber, setSubmittedQuoteNumber] = useState("");
  const [submittedQuoteId, setSubmittedQuoteId] = useState("");
  const [submitError, setSubmitError] = useState("");

  const supplierGroups = getItemsBySupplier();
  const subtotal = getTotal();

  const handleSubmitQuote = async () => {
    if (!destinationCountry) { setSubmitError("Please select a destination country."); return; }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          destinationCountry,
          destinationCity: destinationCity || undefined,
          shippingMode,
          incoterms,
          cargoReadyDate: cargoReadyDate || undefined,
          buyerNotes: buyerNotes || undefined,
          buyerCompanyName: companyName || undefined,
          buyerTaxId: taxId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to submit quote request");
      setSubmittedQuoteNumber(data.quoteNumber);
      setSubmittedQuoteId(data.quoteId);
      clearCart();
      setStep("submitted");
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && step !== "submitted") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Your cart is empty
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">Browse the marketplace to find products</p>
          <Link href="/marketplace" className="btn-primary">Explore Marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)]">
      {/* Header */}
      <header className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
              {step === "submitted" ? "Quote Submitted" : step === "quote_form" ? "Shipping Details" : "Your Cart"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <Shield className="w-4 h-4 text-[var(--success)]" />
            Secure checkout
          </div>
        </div>
      </header>

      {/* ── Submitted ─────────────────────────────────────────────────────── */}
      {step === "submitted" && (
        <div className="max-w-[600px] mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Quote request submitted!
          </h2>
          <p className="text-[var(--text-secondary)] mb-2">
            Our logistics team will calculate your full landed cost — shipping, customs, and duties.
          </p>
          <p className="font-mono text-sm text-[var(--amber-dark)] font-semibold mb-8">{submittedQuoteNumber}</p>
          <p className="text-sm text-[var(--text-tertiary)] mb-8">
            You will be notified when the quote is ready (usually within 1–2 business days).
            Once ready, you can review the full cost breakdown and pay from your quotes dashboard.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push(`/quotes/${submittedQuoteId}`)}
              className="btn-primary"
            >
              View Quote
            </button>
            <Link href="/marketplace" className="btn-outline">Continue Shopping</Link>
          </div>
        </div>
      )}

      {/* ── Cart + Quote Form ──────────────────────────────────────────────── */}
      {(step === "cart" || step === "quote_form") && (
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Step indicator */}
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => setStep("cart")}
                  className={`flex items-center gap-2 font-semibold ${step === "cart" ? "text-[var(--amber-dark)]" : "text-[var(--text-tertiary)]"}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "cart" ? "bg-[var(--amber)] text-white" : "bg-[var(--border-subtle)] text-[var(--text-tertiary)]"}`}>1</span>
                  Cart
                </button>
                <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                <button
                  onClick={() => items.length > 0 && setStep("quote_form")}
                  className={`flex items-center gap-2 font-semibold ${step === "quote_form" ? "text-[var(--amber-dark)]" : "text-[var(--text-tertiary)]"}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "quote_form" ? "bg-[var(--amber)] text-white" : "bg-[var(--border-subtle)] text-[var(--text-tertiary)]"}`}>2</span>
                  Shipping Details
                </button>
              </div>

              {/* ── Step 1: Cart Items ───────────────────────────────────── */}
              {step === "cart" && (
                <>
                  {supplierGroups.map((group) => (
                    <div key={group.supplierId} className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                      <div className="px-6 py-4 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center gap-3">
                        <Truck className="w-4 h-4 text-[var(--amber-dark)]" />
                        <span className="font-semibold text-[var(--text-primary)]">{group.supplierName}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">{group.items.length} item{group.items.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {group.items.map((item) => (
                          <div key={`${item.productId}-${item.variantId}`} className="px-6 py-4 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[var(--text-primary)] truncate">{item.productName}</h4>
                              {item.variantName && <p className="text-xs text-[var(--text-tertiary)]">{item.variantName}</p>}
                              <p className="text-sm font-semibold text-[var(--amber-dark)] mt-1">
                                ${(item.unitPrice / 100).toFixed(2)} × {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)} className="w-8 h-8 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-10 text-center font-semibold text-sm">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="w-8 h-8 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                              <button onClick={() => removeItem(item.productId, item.variantId)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors ml-2">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button onClick={() => setStep("quote_form")} className="btn-primary w-full !py-4 flex items-center justify-center gap-2">
                    <Ship className="w-5 h-5" />
                    Continue to Shipping Details
                  </button>
                </>
              )}

              {/* ── Step 2: Quote Form ────────────────────────────────────── */}
              {step === "quote_form" && (
                <>
                  {/* Invoice info */}
                  <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-[var(--amber-dark)]" />
                      <h3 className="font-bold text-[var(--text-primary)]">Invoice Information</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Company Name</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name"
                          className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tax ID / VAT Number</label>
                        <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="e.g. TIN, VAT number"
                          className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Shipping details */}
                  <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Ship className="w-5 h-5 text-[var(--amber-dark)]" />
                      <h3 className="font-bold text-[var(--text-primary)]">Shipping &amp; Destination</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            Destination Country <span className="text-[var(--danger)]">*</span>
                          </label>
                          <select value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all">
                            <option value="">Select country…</option>
                            {DESTINATION_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">City / Port</label>
                          <input type="text" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} placeholder="e.g. Lagos, Mombasa"
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Shipping Mode</label>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {SHIPPING_MODES.map((m) => (
                            <label key={m.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${shippingMode === m.value ? "border-[var(--amber)] bg-[var(--amber)]/5" : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"}`}>
                              <input type="radio" name="shippingMode" value={m.value} checked={shippingMode === m.value} onChange={() => setShippingMode(m.value)} className="mt-0.5 accent-[var(--amber)]" />
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{m.label}</p>
                                <p className="text-xs text-[var(--text-tertiary)]">{m.note}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Trade Terms (Incoterms)</label>
                        <div className="space-y-2">
                          {INCOTERMS.map((t) => (
                            <label key={t.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${incoterms === t.value ? "border-[var(--amber)] bg-[var(--amber)]/5" : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"}`}>
                              <input type="radio" name="incoterms" value={t.value} checked={incoterms === t.value} onChange={() => setIncoterms(t.value)} className="accent-[var(--amber)]" />
                              <div className="flex-1">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">{t.label}</span>
                                <span className="text-xs text-[var(--text-tertiary)] ml-2">— {t.note}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cargo Ready Date</label>
                          <input type="date" value={cargoReadyDate} onChange={(e) => setCargoReadyDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Notes for logistics team</label>
                        <textarea value={buyerNotes} onChange={(e) => setBuyerNotes(e.target.value)} rows={3}
                          placeholder="Special handling requirements, preferred carrier, customs agent contact, etc."
                          className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all resize-none" />
                      </div>
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{submitError}</div>
                  )}
                </>
              )}
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 sticky top-24">
                <h3 className="font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Cart Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">
                      {items.length} item{items.length !== 1 ? "s" : ""} from {supplierGroups.length} supplier{supplierGroups.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold">${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Shipping &amp; Customs</span>
                    <span className="text-[var(--amber-dark)] font-semibold">Calculated in quote</span>
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-base text-[var(--text-primary)]">Goods Value</span>
                      <span className="font-bold text-xl text-[var(--amber-dark)]" style={{ fontFamily: "var(--font-display)" }}>
                        ${(subtotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Final landed cost (including shipping, customs &amp; duties) will be shown in your quote.
                    </p>
                  </div>
                </div>

                {step === "quote_form" && (
                  <button
                    onClick={handleSubmitQuote}
                    disabled={isSubmitting || !destinationCountry}
                    className="btn-primary w-full mt-6 !py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                      : <><Ship className="w-5 h-5" /> Submit Quote Request</>}
                  </button>
                )}

                {step === "cart" && (
                  <button onClick={() => setStep("quote_form")} className="btn-primary w-full mt-6 !py-4 flex items-center justify-center gap-2">
                    <Ship className="w-5 h-5" />
                    Continue to Shipping Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
