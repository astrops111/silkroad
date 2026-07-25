"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Smartphone, CreditCard,
  Loader2, CheckCircle2, FileClock,
} from "lucide-react";
import PaymentTermsSelector from "@/components/checkout/PaymentTermsSelector";
import type { PaymentTermsResult } from "@/lib/payments/payment-terms";
import { CHECKOUT_FEATURES } from "@/lib/payments/checkout-feature-flags";

type PaymentMethod = "flutterwave" | "xtransfer" | "xtransfer_mobile" | "mtn_momo" | "airtel_money" | "stripe";
type Step = "loading" | "terms" | "pay" | "confirming" | "instructions" | "success" | "invoiced" | "already_paid" | "unavailable";

interface WireInstructions {
  reference: string;
  bankName: string;
  accountNo: string;
  swiftCode: string;
  iban: string | null;
  routingNumber: string | null;
  amount: number;
  currency: string;
  expiresAt: string;
}

const XTRANSFER_COUNTRY_CODES = new Set([
  "NG","CM","CI","BJ","TZ","ZA","SN","RW","UG","ZM","CD",
]);

const XTRANSFER_COUNTRIES = [
  { code: "NG", name: "Nigeria",       networks: "NIBSS" },
  { code: "CM", name: "Cameroon",      networks: "Orange, MTN" },
  { code: "CI", name: "Côte d'Ivoire", networks: "Orange, MTN, Moov" },
  { code: "BJ", name: "Benin",         networks: "MTN, Moov" },
  { code: "TZ", name: "Tanzania",      networks: "Vodacom" },
  { code: "ZA", name: "South Africa",  networks: "OZOW" },
  { code: "SN", name: "Senegal",       networks: "Orange, Free Money" },
  { code: "RW", name: "Rwanda",        networks: "Airtel, MTN" },
  { code: "UG", name: "Uganda",        networks: "MTN, Airtel" },
  { code: "ZM", name: "Zambia",        networks: "MTN" },
  { code: "CD", name: "DR Congo",      networks: "Airtel, Voda" },
];

const PAYMENT_METHODS: {
  id: PaymentMethod; name: string; icon: typeof CreditCard;
  description: string; badge?: "recommended" | "fallback";
}[] = [
  { id: "flutterwave",      name: "Pay with Flutterwave",     icon: CreditCard, description: "Card, bank transfer & mobile money — Africa's leading payment gateway.", badge: "recommended" },
  { id: "xtransfer",        name: "B2B Wire Transfer",        icon: Building2,  description: "SWIFT wire via XTransfer. 0 receiving fees. 1–3 business days." },
  { id: "xtransfer_mobile", name: "Mobile Money (XTransfer)", icon: Smartphone, description: "MTN, Orange, Airtel, Vodacom, NIBSS, OZOW. Instant." },
  { id: "stripe",           name: "Card Payment (Stripe)",    icon: CreditCard, description: "Visa, Mastercard via Stripe." },
  { id: "mtn_momo",         name: "MTN Mobile Money",         icon: Smartphone, description: "Via Flutterwave.", badge: "fallback" },
  { id: "airtel_money",     name: "Airtel Money",             icon: Smartphone, description: "Via Flutterwave.", badge: "fallback" },
];

export default function OrderPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = id;
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("loading");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("flutterwave");
  const [buyerCountry, setBuyerCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pollStatus, setPollStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wireInstructions, setWireInstructions] = useState<WireInstructions | null>(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);

  const [grandTotal, setGrandTotal] = useState<number | null>(null);
  const [buyerStats, setBuyerStats] = useState({ verified: false, totalOrders: 0, totalSpend: 0 });
  const [invoiceDueDate, setInvoiceDueDate] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [submittingTerms, setSubmittingTerms] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        const order = d.order;
        if (!order) {
          setStep("unavailable");
          return;
        }
        setCurrency(order.currency ?? "USD");
        setGrandTotal(order.grand_total ?? null);
        setBuyerStats(d.buyerStats ?? { verified: false, totalOrders: 0, totalSpend: 0 });

        const existingTerms = order.metadata?.paymentTerms as PaymentTermsResult | undefined;

        if (order.status === "deposit_paid" && existingTerms?.deposit) {
          // Balance leg — terms are already locked in, go straight to gateway selection.
          setTotalAmount(existingTerms.deposit.balanceAmount);
          setStep("pay");
        } else if (order.status === "pending_payment" && !CHECKOUT_FEATURES.paymentTerms) {
          // Payment-terms UI temporarily hidden — go straight to immediate/full payment.
          // resolveChargeAmount() already defaults to the full amount when no
          // paymentTerms metadata is set, so skipping the PATCH call here is safe.
          setTotalAmount(order.grand_total ?? null);
          setStep("pay");
        } else if (order.status === "pending_payment") {
          setStep("terms");
        } else if (["paid", "confirmed", "in_production", "quality_check", "ready_to_ship",
                    "assigned_to_logistics", "dispatched", "in_transit", "out_for_delivery",
                    "delivered", "completed"].includes(order.status)) {
          setStep("already_paid");
        } else {
          setStep("unavailable");
        }
      })
      .catch(() => setStep("unavailable"));
  }, [orderId]);

  // Flutterwave's hosted card checkout redirects back here with ?status=&tx_ref=
  useEffect(() => {
    const flwStatus = searchParams.get("status");
    const txRef = searchParams.get("tx_ref");
    if (!flwStatus || !txRef) return;

    if (flwStatus !== "successful") {
      setError("Payment was not completed.");
      return;
    }

    setStep("confirming");
    setPollStatus("Confirming your payment…");
    fetch(`/api/payments/flutterwave/status?transactionId=${txRef}`)
      .then((r) => r.json())
      .then((s) => {
        if (s.status === "succeeded") setStep("success");
        else {
          setError(s.status === "failed" ? "Payment was declined." : "Payment is still processing — check your orders shortly.");
          setStep("pay");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTermsSelect(result: PaymentTermsResult) {
    setSubmittingTerms(true);
    setTermsError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/payment-terms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentTerms: result.type,
          depositPercent: result.deposit?.depositPercent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set payment terms");

      if (data.requiresPayment) {
        setTotalAmount(data.paymentTerms.payNowAmount);
        setStep("pay");
      } else {
        setInvoiceDueDate(data.paymentTerms.invoiceDueDate ?? null);
        setStep("invoiced");
      }
    } catch (e) {
      setTermsError((e as Error).message);
    } finally {
      setSubmittingTerms(false);
    }
  }

  const handleCountryChange = (country: string) => {
    setBuyerCountry(country);
    const xtSupported = XTRANSFER_COUNTRY_CODES.has(country);
    if (xtSupported && (selectedPayment === "mtn_momo" || selectedPayment === "airtel_money")) {
      setSelectedPayment("xtransfer_mobile");
    } else if (!xtSupported && selectedPayment === "xtransfer_mobile") {
      setSelectedPayment("mtn_momo");
    }
  };

  const visibleMethods = PAYMENT_METHODS.filter((m) => {
    if (!buyerCountry) return true;
    const xtSupported = XTRANSFER_COUNTRY_CODES.has(buyerCountry);
    if (xtSupported && (m.id === "mtn_momo" || m.id === "airtel_money")) return false;
    if (!xtSupported && m.id === "xtransfer_mobile") return false;
    return true;
  });

  const needsPhone = ["xtransfer_mobile", "mtn_momo", "airtel_money"].includes(selectedPayment);

  const handlePay = async () => {
    if (!orderId || !totalAmount) return;
    setIsSubmitting(true);
    setError(null);
    setStep("confirming");

    try {
      if (selectedPayment === "xtransfer") {
        const res = await fetch("/api/payments/xtransfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, amount: totalAmount, currency }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "Failed to initiate wire transfer");
        setWireInstructions(data.paymentInstructions as WireInstructions);
        setIsSubmitting(false);
        setStep("instructions");

      } else if (selectedPayment === "xtransfer_mobile") {
        const res = await fetch("/api/payments/xtransfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, amount: totalAmount, currency, phoneNumber, country: buyerCountry }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "Failed to send payment request");
        setPollStatus("Payment request sent to your phone. Please approve it now…");
        const txId = data.transactionId;
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const s = await fetch(`/api/payments/xtransfer/status?transactionId=${txId}`).then((r) => r.json());
          if (s.status === "succeeded") { clearInterval(poll); setStep("success"); }
          else if (s.status === "failed" || attempts >= 24) {
            clearInterval(poll);
            setError(s.status === "failed" ? "Payment was declined." : "Payment timed out.");
            setIsSubmitting(false);
            setStep("pay");
          }
        }, 5000);

      } else if (selectedPayment === "stripe") {
        const res = await fetch("/api/payments/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, amount: totalAmount, currency: currency.toLowerCase() }),
        });
        const data = await res.json();
        if (data.requiresAction && data.actionUrl) { window.location.href = data.actionUrl; return; }
        if (data.status === "succeeded") setStep("success");

      } else if (selectedPayment === "flutterwave") {
        const returnUrl = `${window.location.origin}/orders/${orderId}/pay`;
        const res = await fetch("/api/payments/flutterwave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, amount: totalAmount, currency, buyerCountry, returnUrl }),
        });
        const data = await res.json();
        if (!data.success && !data.requiresAction) throw new Error(data.message ?? "Failed to initiate payment");
        if (data.requiresAction && data.actionUrl) { window.location.href = data.actionUrl; return; }
        if (data.status === "succeeded") setStep("success");

      } else {
        // mtn_momo / airtel_money — both charged via Flutterwave's mobile money API
        const network = selectedPayment === "mtn_momo" ? "MTN" : "AIRTEL";
        const res = await fetch("/api/payments/flutterwave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, phoneNumber, currency, amount: totalAmount, buyerCountry, network }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message ?? "Payment failed");
        setPollStatus("Payment request sent to your phone. Please approve it now…");
        const txId = data.transactionId;
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const s = await fetch(`/api/payments/flutterwave/status?transactionId=${txId}`).then((r) => r.json());
          if (s.status === "succeeded") { clearInterval(poll); setStep("success"); }
          else if (s.status === "failed" || attempts >= 24) {
            clearInterval(poll);
            setError(s.status === "failed" ? "Payment was declined." : "Payment timed out.");
            setIsSubmitting(false);
            setStep("pay");
          }
        }, 5000);
      }
    } catch (e) {
      setError((e as Error).message);
      setIsSubmitting(false);
      setStep("pay");
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-tertiary)" }} />
      </div>
    );
  }

  if (step === "unavailable") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="max-w-[420px] text-center px-6">
          <p className="text-[var(--text-secondary)] mb-6">This order can&apos;t be paid right now.</p>
          <Link href="/dashboard/orders" className="btn-primary">View Orders</Link>
        </div>
      </div>
    );
  }

  if (step === "already_paid") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="max-w-[420px] text-center px-6">
          <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-[var(--success)]" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            This order is already paid
          </h2>
          <Link href="/dashboard/orders" className="btn-primary mt-4 inline-block">View Orders</Link>
        </div>
      </div>
    );
  }

  if (step === "invoiced") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="max-w-[480px] w-full mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--amber)]/10 flex items-center justify-center mx-auto mb-6">
            <FileClock className="w-10 h-10 text-[var(--amber-dark)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Invoice sent
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            No payment is due now. Your order is confirmed on credit terms
            {invoiceDueDate ? ` — payment is due by ${new Date(invoiceDueDate).toLocaleDateString(undefined, { dateStyle: "long" })}` : ""}.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/orders" className="btn-primary">View Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "terms") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)]">
        <div className="max-w-[640px] mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard/orders" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
              How would you like to pay?
            </h1>
          </div>

          {termsError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{termsError}</div>
          )}

          <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6">
            {grandTotal != null && (
              <PaymentTermsSelector
                totalAmount={grandTotal}
                currency={currency}
                buyerVerified={buyerStats.verified}
                totalOrders={buyerStats.totalOrders}
                totalSpend={buyerStats.totalSpend}
                onSelect={handleTermsSelect}
              />
            )}
          </div>

          {submittingTerms && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Setting up payment…
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="max-w-[500px] w-full mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Payment confirmed!
          </h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Your order is confirmed. Suppliers have been notified and will begin processing.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary">View Orders</Link>
            <Link href="/quotes" className="btn-outline">My Quotes</Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "instructions" && wireInstructions) {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)]">
        <div className="max-w-[640px] mx-auto px-6 py-12">
          <div className="bg-[var(--surface-primary)] rounded-2xl border-2 border-[var(--amber)] overflow-hidden">
            <div className="px-8 py-6 bg-[var(--amber)]/5 border-b border-[var(--amber)]/30 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-[var(--amber-dark)]" />
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
                  Wire Transfer Instructions
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">Complete within 5 business days.</p>
              </div>
            </div>
            <div className="px-8 py-6 space-y-6">
              <div className="rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/40 p-4">
                <p className="text-xs font-semibold text-[var(--amber-dark)] uppercase tracking-wider mb-1">Required Reference / Memo</p>
                <p className="text-2xl font-mono font-bold text-[var(--text-primary)] tracking-widest">{wireInstructions.reference}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">You MUST include this in your wire transfer memo.</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-secondary)] p-4">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Amount</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {wireInstructions.currency} {(wireInstructions.amount / 100).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)]">
                {[
                  { label: "Beneficiary Bank", value: wireInstructions.bankName },
                  { label: "Account Number",   value: wireInstructions.accountNo, mono: true },
                  { label: "SWIFT / BIC",      value: wireInstructions.swiftCode, mono: true },
                  ...(wireInstructions.iban ? [{ label: "IBAN", value: wireInstructions.iban, mono: true }] : []),
                  ...(wireInstructions.routingNumber ? [{ label: "Routing (US)", value: wireInstructions.routingNumber, mono: true }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 bg-[var(--surface-primary)]">
                    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                    <span className={`font-semibold text-[var(--text-primary)] ${mono ? "font-mono text-sm" : ""}`}>{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-primary)]">
                  <span className="text-sm text-[var(--text-secondary)]">Payment Deadline</span>
                  <span className="font-semibold text-[var(--danger)]">
                    {new Date(wireInstructions.expiresAt).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-center text-[var(--text-tertiary)]">
                Processed via <span className="font-semibold">XTransfer</span> — 0 receiving fees · 1–3 business days
              </p>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <Link href="/dashboard" className="btn-primary flex-1 text-center">View My Orders</Link>
              <Link href="/quotes" className="btn-outline flex-1 text-center">My Quotes</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <div className="min-h-screen bg-[var(--surface-secondary)] flex items-center justify-center">
        <div className="text-center max-w-[400px] px-6">
          <Loader2 className="w-12 h-12 text-[var(--amber)] animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{pollStatus || "Processing…"}</h2>
          <p className="text-[var(--text-secondary)] text-sm">Check your phone for the payment prompt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-secondary)]">
      <div className="max-w-[640px] mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/orders" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>Payment</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Amount Due Now</span>
            <span className="text-2xl font-bold text-[var(--amber-dark)]" style={{ fontFamily: "var(--font-display)" }}>
              {totalAmount != null ? `${currency} ${(totalAmount / 100).toFixed(2)}` : "—"}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Includes goods, shipping, customs, and duties</p>
        </div>

        <div className="bg-[var(--surface-primary)] rounded-2xl border border-[var(--border-subtle)] p-6 mb-6">
          <h3 className="font-bold text-[var(--text-primary)] mb-5" style={{ fontFamily: "var(--font-display)" }}>
            Payment Method
          </h3>

          <div className="mb-5">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Your Country</label>
            <select
              value={buyerCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all"
            >
              <option value="">Select your country…</option>
              <optgroup label="Supported via XTransfer Mobile">
                {XTRANSFER_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Other markets">
                {[
                  { code: "GH", name: "Ghana" }, { code: "KE", name: "Kenya" },
                  { code: "ET", name: "Ethiopia" }, { code: "EG", name: "Egypt" },
                  { code: "MA", name: "Morocco" },
                ].map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </optgroup>
            </select>
          </div>

          <div className="space-y-3">
            {visibleMethods.map((method) => (
              <label
                key={method.id}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPayment === method.id
                    ? "border-[var(--amber)] bg-[var(--amber)]/5"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                }`}
              >
                <input
                  type="radio" name="payment" value={method.id}
                  checked={selectedPayment === method.id}
                  onChange={() => setSelectedPayment(method.id)}
                  className="mt-1 accent-[var(--amber)]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <method.icon className="w-4 h-4 text-[var(--amber-dark)]" />
                    <span className="font-semibold text-[var(--text-primary)]">{method.name}</span>
                    {method.badge === "recommended" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--amber)]/15 text-[var(--amber-dark)]">Recommended</span>
                    )}
                    {method.badge === "fallback" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--text-tertiary)]">via Flutterwave</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{method.description}</p>
                </div>
              </label>
            ))}
          </div>

          {needsPhone && (
            <div className="mt-4">
              {selectedPayment === "xtransfer_mobile" && buyerCountry && XTRANSFER_COUNTRIES.find((c) => c.code === buyerCountry) && (
                <p className="text-xs font-medium text-[var(--amber-dark)] mb-2">
                  Networks: {XTRANSFER_COUNTRIES.find((c) => c.code === buyerCountry)!.networks}
                </p>
              )}
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Mobile Number</label>
              <input
                type="tel" value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+234 XXX XXX XXXX"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/30 focus:border-[var(--amber)] transition-all"
              />
            </div>
          )}
        </div>

        <button
          onClick={handlePay}
          disabled={!orderId || !totalAmount || isSubmitting || (needsPhone && !phoneNumber)}
          className="btn-primary w-full !py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
            : <>Pay {totalAmount != null ? `${currency} ${(totalAmount / 100).toFixed(2)}` : ""} →</>}
        </button>

        <div className="mt-4 flex items-center gap-2 justify-center text-xs text-[var(--text-tertiary)]">
          <Smartphone className="w-3.5 h-3.5 text-[var(--success)]" />
          Pay directly in {currency} via mobile money — no forex conversion needed
        </div>
      </div>
    </div>
  );
}
