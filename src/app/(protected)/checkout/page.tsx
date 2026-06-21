"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart";
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  Truck,
  Shield,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Package,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";

type PaymentMethod = "mtn_momo" | "airtel_money" | "stripe" | "bank_transfer" | "xtransfer";
type CheckoutStep = "cart" | "shipping" | "payment" | "confirming" | "instructions" | "success";

interface XTransferInstructions {
  reference: string;
  bankName: string;
  accountNo: string;
  swiftCode: string;
  iban: string | null;
  routingNumber: string | null;
  amount: number;
  currency: string;
  expiresAt: string;
  memo: string;
}

const PAYMENT_METHODS: {
  id: PaymentMethod;
  name: string;
  icon: typeof CreditCard;
  description: string;
  fields: string[];
}[] = [
  {
    id: "mtn_momo",
    name: "MTN Mobile Money",
    icon: Smartphone,
    description: "Pay via MTN MoMo. You'll receive a USSD prompt on your phone.",
    fields: ["phone"],
  },
  {
    id: "airtel_money",
    name: "Airtel Money",
    icon: Smartphone,
    description: "Pay via Airtel Money. Enter your registered number.",
    fields: ["phone"],
  },
  {
    id: "stripe",
    name: "Card Payment",
    icon: CreditCard,
    description: "Visa, Mastercard, or other cards via Stripe.",
    fields: ["card"],
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    icon: Building2,
    description: "For large orders. Transfer details will be provided after order creation.",
    fields: [],
  },
  {
    id: "xtransfer",
    name: "XTransfer (B2B Wire)",
    icon: Building2,
    description: "Cross-border SWIFT wire via XTransfer. Recommended for orders from China, SE Asia, Korea, Japan. 0 receiving fees.",
    fields: [],
  },
];

export default function CheckoutPage() {
  const { items, getItemsBySupplier, getTotal, updateQuantity, removeItem } = useCartStore();
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("mtn_momo");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>("");
  const [xtransferInstructions, setXtransferInstructions] = useState<XTransferInstructions | null>(null);

  const supplierGroups = getItemsBySupplier();
  const subtotal = getTotal();
  // Estimated tax (15% — actual calculated by API)
  const estimatedTax = Math.round(subtotal * 0.15);
  const grandTotal = subtotal + estimatedTax;

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setStep("confirming");

    try {
      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          buyerCompanyName: companyName || undefined,
          buyerTaxId: taxId || undefined,
          paymentGateway: selectedPayment,
          phoneNumber: phoneNumber || undefined,
          currency: "USD",
        }),
      });

      const order = await orderRes.json();
      if (!order.success) throw new Error(order.error);

      // 2. Initiate payment
      if (selectedPayment === "mtn_momo" || selectedPayment === "airtel_money") {
        // Mobile money flow
        const payRes = await fetch(`/api/payments/mtn-momo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            phoneNumber,
            currency: "USD",
            amount: grandTotal,
          }),
        });

        const payment = await payRes.json();
        if (!payment.success) throw new Error(payment.message);

        // Poll for status
        setPollStatus("Waiting for payment confirmation...");
        const txId = payment.transactionId;
        let attempts = 0;
        const maxAttempts = 24; // 2 minutes at 5s intervals

        const pollInterval = setInterval(async () => {
          attempts++;
          const statusRes = await fetch(
            `/api/payments/mtn-momo/status?transactionId=${txId}`
          );
          const status = await statusRes.json();

          if (status.status === "succeeded") {
            clearInterval(pollInterval);
            setStep("success");
            useCartStore.getState().clearCart();
          } else if (status.status === "failed" || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPollStatus("Payment failed or timed out. Please try again.");
            setIsSubmitting(false);
            setStep("payment");
          }
        }, 5000);
      } else if (selectedPayment === "stripe") {
        // Stripe flow — redirect to Stripe checkout
        const payRes = await fetch("/api/payments/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            amount: grandTotal,
            currency: "usd",
          }),
        });

        const payment = await payRes.json();
        if (payment.requiresAction && payment.actionUrl) {
          window.location.href = payment.actionUrl;
          return;
        }
        if (payment.status === "succeeded") {
          setStep("success");
          useCartStore.getState().clearCart();
        }
      } else if (selectedPayment === "xtransfer") {
        // XTransfer B2B wire — fetch virtual account instructions, show instructions step
        const payRes = await fetch("/api/payments/xtransfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            amount: grandTotal,
            currency: "USD",
          }),
        });
        const payment = await payRes.json();
        if (!payment.success) throw new Error(payment.error ?? "Failed to get payment instructions");
        setXtransferInstructions(payment.paymentInstructions as XTransferInstructions);
        setIsSubmitting(false);
        setStep("instructions");
        // Cart is NOT cleared here — cleared when user dismisses the instructions screen
      } else {
        // Bank transfer — just show success with transfer details
        setStep("success");
        useCartStore.getState().clearCart();
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setPollStatus(`Error: ${(err as Error).message}`);
      setIsSubmitting(false);
      setStep("payment");
    }
  };

  if (items.length === 0 && step !== "success") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Your cart is empty
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">Browse the marketplace to find products</p>
          <Link href="/marketplace" className="btn-primary">
            Explore Marketplace
          </Link>
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
              Checkout
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <Shield className="w-4 h-4 text-[var(--success)]" />
            Secure checkout
          </div>
        </div>
      </header>

      {/* Success State */}
      {step === "success" && (
        <div className="max-w-[600px] mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Order placed successfully!
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            {selectedPayment === "bank_transfer" || selectedPayment === "xtransfer"
              ? "Transfer details have been sent to your email. Your order will be confirmed once payment is received."
              : "Your payment has been confirmed. Suppliers have been notified and will begin processing your order."}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="btn-primary">View Orders</Link>
            <Link href="/marketplace" className="btn-outline">Continue Shopping</Link>
          </div>
        </div>
      )}

      {/* XTransfer Bank Transfer Instructions */}
      {step === "instructions" && xtransferInstructions && (
        <div className="max-w-[640px] mx-auto px-6 py-12">
          <div className="bg-[var(--surface-primary)] rounded-2xl border-2 border-[var(--amber)] overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 bg-[var(--amber)]/5 border-b border-[var(--amber)]/30 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-[var(--amber-dark)]" />
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
                  Wire Transfer Instructions
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  Your order is reserved. Complete your bank transfer within 5 business days.
                </p>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Reference — most critical */}
              <div className="rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/40 p-4">
                <p className="text-xs font-semibold text-[var(--amber-dark)] uppercase tracking-wider mb-1">
                  Required Payment Reference / Memo
                </p>
                <p className="text-2xl font-mono font-bold text-[var(--text-primary)] tracking-widest">
                  {xtransferInstructions.reference}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  You MUST include this reference in your wire transfer memo / remarks field. Without it, we cannot match your payment to your order.
                </p>
              </div>

              {/* Amount */}
              <div className="rounded-xl bg-[var(--surface-secondary)] p-4">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Amount to Transfer</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
                  {xtransferInstructions.currency} {(xtransferInstructions.amount / 100).toFixed(2)}
                </p>
              </div>

              {/* Bank details */}
              <div className="space-y-0 divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                {[
                  { label: "Beneficiary Bank", value: xtransferInstructions.bankName },
                  { label: "Account Number", value: xtransferInstructions.accountNo, mono: true },
                  { label: "SWIFT / BIC", value: xtransferInstructions.swiftCode, mono: true },
                  ...(xtransferInstructions.iban ? [{ label: "IBAN", value: xtransferInstructions.iban, mono: true }] : []),
                  ...(xtransferInstructions.routingNumber ? [{ label: "Routing Number (US)", value: xtransferInstructions.routingNumber, mono: true }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 bg-[var(--surface-primary)]">
                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                    <span className={`font-semibold text-[var(--text-primary)] ${mono ? "font-mono text-sm" : ""}`}>
                      {value}
                    </span>
                  </div>
                ))}
                {xtransferInstructions.expiresAt && (
                  <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-primary)]">
                    <span className="text-sm text-[var(--text-secondary)]">Payment Deadline</span>
                    <span className="font-semibold text-[var(--danger)]">
                      {new Date(xtransferInstructions.expiresAt).toLocaleDateString(undefined, { dateStyle: "long" })}
                    </span>
                  </div>
                )}
              </div>

              {/* Powered by XTransfer badge */}
              <p className="text-xs text-center text-[var(--text-tertiary)]">
                Payment processed via{" "}
                <span className="font-semibold text-[var(--text-secondary)]">XTransfer</span>
                {" "}— 0 receiving fees · 1–3 business days
              </p>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex gap-3">
              <Link href="/dashboard" className="btn-primary flex-1 text-center">
                View My Orders
              </Link>
              <button
                onClick={() => {
                  useCartStore.getState().clearCart();
                  setStep("success");
                }}
                className="btn-outline flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirming State (Mobile Money) */}
      {step === "confirming" && (
        <div className="max-w-[600px] mx-auto px-6 py-20 text-center">
          <Loader2 className="w-12 h-12 text-[var(--amber)] animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {pollStatus || "Processing your payment..."}
          </h2>
          <p className="text-[var(--text-secondary)]">
            {selectedPayment.includes("momo") || selectedPayment.includes("airtel")
              ? "Check your phone for the USSD prompt. Enter your PIN to confirm payment."
              : "Please wait while we process your payment."}
          </p>
        </div>
      )}

      {/* Cart + Payment Flow */}
      {(step === "cart" || step === "shipping" || step === "payment") && (
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Cart Items + Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Items by Supplier */}
              {supplierGroups.map((group) => (
                <div
                  key={group.supplierId}
                  className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
                >
                  <div className="px-6 py-4 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center gap-3">
                    <Truck className="w-4 h-4 text-[var(--amber-dark)]" />
                    <span className="font-semibold text-[var(--text-primary)]">
                      {group.supplierName}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {group.items.length} item{group.items.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    {group.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="px-6 py-4 flex items-center gap-4"
                      >
                        <div className="w-16 h-16 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[var(--text-primary)] truncate">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-xs text-[var(--text-tertiary)]">{item.variantName}</p>
                          )}
                          <p className="text-sm font-semibold text-[var(--amber-dark)] mt-1">
                            ${(item.unitPrice / 100).toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                            className="w-8 h-8 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                            className="w-8 h-8 rounded-lg border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Invoice Info */}
              <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                <h3 className="font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Invoice Information
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="e.g. TIN, VAT number"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6">
                <h3 className="font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Payment Method
                </h3>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedPayment === method.id
                          ? "border-[var(--amber)] bg-[var(--amber)]/5"
                          : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={selectedPayment === method.id}
                        onChange={() => setSelectedPayment(method.id)}
                        className="mt-1 accent-[var(--amber)]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <method.icon className="w-4 h-4 text-[var(--amber-dark)]" />
                          <span className="font-semibold text-[var(--text-primary)]">{method.name}</span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">{method.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Phone number input for mobile money */}
                {(selectedPayment === "mtn_momo" || selectedPayment === "airtel_money") && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+233 XXX XXX XXXX"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 sticky top-24">
                <h3 className="font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">
                      Subtotal ({items.length} items from {supplierGroups.length} supplier{supplierGroups.length > 1 ? "s" : ""})
                    </span>
                    <span className="font-semibold">${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Shipping</span>
                    <span className="text-[var(--success)] font-semibold">Calculated at confirmation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Estimated Tax</span>
                    <span className="font-semibold">${(estimatedTax / 100).toFixed(2)}</span>
                  </div>

                  <div className="border-t border-[var(--border-subtle)] pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-base text-[var(--text-primary)]">Total</span>
                      <span className="font-bold text-xl text-[var(--amber-dark)]" style={{ fontFamily: "var(--font-display)" }}>
                        ${(grandTotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Final amount includes applicable taxes for your country
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || (["mtn_momo", "airtel_money"].includes(selectedPayment) && !phoneNumber)}
                  className="btn-primary w-full mt-6 !py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Place Order &mdash; ${(grandTotal / 100).toFixed(2)}</>
                  )}
                </button>

                <div className="mt-4 flex items-center gap-2 justify-center text-xs text-[var(--text-tertiary)]">
                  <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
                  Protected by Silk Road Africa Trade Assurance
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
