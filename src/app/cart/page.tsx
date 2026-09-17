"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/stores/cart";
import { DESTINATION_COUNTRIES } from "@/lib/constants/countries";
import {
  PLATFORM_MIN_GROUP_ORDER_VALUE,
  shippingModeLabel,
} from "@/lib/logistics/rates/config";
import { CHECKOUT_FEATURES } from "@/lib/payments/checkout-feature-flags";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Send,
  ExternalLink,
  FileText,
  LogIn,
} from "lucide-react";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Quantity control for one cart line: minus / typed input / plus.
 * Boxed SKUs (boxPackQty > 1) are entered and stepped in whole boxes; the
 * store always holds pieces, so every value is multiplied back up on commit.
 */
function QuantityStepper({
  quantity,
  moq,
  boxPackQty,
  onChange,
}: {
  quantity: number;
  moq: number;
  boxPackQty?: number;
  onChange: (pieces: number) => void;
}) {
  const step = boxPackQty && boxPackQty > 1 ? boxPackQty : 1;
  const boxed = step > 1;
  const displayQty = boxed ? Math.round(quantity / step) : quantity;
  const minDisplay = Math.max(1, boxed ? Math.round(moq / step) : moq);

  const [draft, setDraft] = useState(String(displayQty));
  // Re-sync during render when the store value changes from outside the input
  // (+/- buttons, MOQ clamp) — an effect here would cascade an extra render.
  const [syncedQty, setSyncedQty] = useState(displayQty);
  if (syncedQty !== displayQty) {
    setSyncedQty(displayQty);
    setDraft(String(displayQty));
  }

  function commit() {
    const parsed = parseInt(draft, 10);
    const next = Number.isNaN(parsed) ? minDisplay : Math.max(minDisplay, parsed);
    setDraft(String(next));
    if (next !== displayQty) onChange(next * step);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(quantity - step)}
        disabled={displayQty <= minDisplay}
        aria-label="Decrease quantity"
        className="w-8 h-8 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus className="w-3 h-3" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={draft}
        aria-label={boxed ? "Quantity in boxes" : "Quantity in pieces"}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(String(displayQty));
        }}
        className="w-16 h-8 text-center text-sm font-medium rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)]"
      />

      <button
        onClick={() => onChange(quantity + step)}
        aria-label="Increase quantity"
        className="w-8 h-8 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)]"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

function CartPageContent() {
  const t = useTranslations("cart");
  const searchParams = useSearchParams();
  // The cart drawer's "View Quote" links here with ?rfq=1 to land the buyer
  // straight on the request-for-quote form.
  const wantsRfq = searchParams.get("rfq") === "1";
  // Self-serve checkout is temporarily off — the cart's only exit is an RFQ.
  const checkoutEnabled = CHECKOUT_FEATURES.checkout;
  const { items, removeItem, updateQuantity, getTotal, clearCart, getItemsByShippingGroup } =
    useCartStore();

  // Recompute only when items change, not on every re-render (qty updates etc.)
  // `items` looks redundant to the linter, but getItemsByShippingGroup is a
  // zustand store method with a stable identity that reads get().items
  // internally. Drop `items` and the dep array never changes, so the memo
  // would go stale the moment the cart does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shippingGroups = useMemo(() => getItemsByShippingGroup(), [items, getItemsByShippingGroup]);
  const anyBelowMinimum = shippingGroups.some((g) => !g.meetsMinimum);

  // RFQ panel state — opens pre-expanded when arriving from the drawer's
  // "View Quote" link (/cart?rfq=1)
  const [rfqOpen, setRfqOpen] = useState(wantsRfq);
  const rfqPanelRef = useRef<HTMLDivElement>(null);
  const [rfqNote, setRfqNote] = useState("");
  const [rfqDeadline, setRfqDeadline] = useState("");
  const [rfqCountry, setRfqCountry] = useState("");
  const [rfqCity, setRfqCity] = useState("");
  const [rfqStatus, setRfqStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  // Guest contact details — only collected, and only required, when signed out.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCompany, setGuestCompany] = useState("");
  const [rfqError, setRfqError] = useState<string | null>(null);
  const [createdRfqs, setCreatedRfqs] = useState<
    { rfqId: string; rfqNumber: string; supplierName: string }[]
  >([]);

  // Guests must leave a name and a plausible email before we can quote them.
  const missingGuestDetails =
    signedIn === false && (!guestName.trim() || !/^\S+@\S+\.\S+$/.test(guestEmail.trim()));

  useEffect(() => {
    if (wantsRfq) rfqPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [wantsRfq]);

  // /cart is a public route, so the page has to ask who (if anyone) is signed
  // in. /api/me answers `{ user: null }` for anonymous visitors.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSignedIn(!!d?.user);
      })
      .catch(() => {
        // Treat an unreachable probe as signed-out: the guest fields are
        // additive, and the API re-validates identity anyway.
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendRfq() {
    setRfqStatus("loading");
    setRfqError(null);
    try {
      const res = await fetch("/api/rfqs/from-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          note: rfqNote || undefined,
          deadline: rfqDeadline || undefined,
          deliveryCountry: rfqCountry || undefined,
          deliveryCity: rfqCity || undefined,
          guest: signedIn
            ? undefined
            : {
                name: guestName,
                email: guestEmail,
                phone: guestPhone || undefined,
                company: guestCompany || undefined,
              },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRfqError(data.error ?? "Failed to send RFQs");
        setRfqStatus("error");
      } else {
        setCreatedRfqs(data.rfqs);
        setRfqStatus("success");
      }
    } catch {
      setRfqError("Network error — please try again");
      setRfqStatus("error");
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-tertiary)] flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-8 h-8 text-[var(--text-tertiary)]" />
        </div>
        <h1
          className="text-2xl font-bold text-[var(--obsidian)] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("empty")}
        </h1>
        <p className="text-[var(--text-tertiary)] mb-6">{t("emptyDesc")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/marketplace">
              <Package className="w-4 h-4" />
              Browse Products
            </Link>
          </Button>
          {/* An empty cart is the most likely moment to be looking for
              already-submitted RFQs. Guests have none to look at. */}
          {signedIn !== false && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/rfq">
                <FileText className="w-4 h-4" />
                View my RFQs
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currency = items[0]?.currency ?? "USD";
  const total = getTotal();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-[var(--obsidian)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")} ({items.length} items)
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Clear cart
        </Button>
      </div>

      {/* Shipping groups */}
      {shippingGroups.map((group) => {
        const modeLabel = shippingModeLabel(group.shippingMode);
        return (
          <div
            key={group.groupKey}
            className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden"
          >
            {/* Group header */}
            <div className="px-4 py-3 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {group.supplierName}
                </p>
                {modeLabel && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{modeLabel}</p>
                )}
              </div>
              {group.meetsMinimum ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Min. order met
                </span>
              ) : (
                <span className="text-xs text-amber-600 font-medium">Below minimum</span>
              )}
            </div>

            {/* Minimum order warning banner */}
            {!group.meetsMinimum && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border-b border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-snug">
                  Add{" "}
                  <span className="font-semibold">
                    {formatPrice(group.shortfallMinor, group.currency)}
                  </span>{" "}
                  more from this supplier to reach the minimum order of{" "}
                  {/* PLATFORM_MIN_GROUP_ORDER_VALUE is USD-cents; display is correct only for USD carts */}
                  <span className="font-semibold">
                    {formatPrice(PLATFORM_MIN_GROUP_ORDER_VALUE, "USD")}
                  </span>
                  .
                </p>
              </div>
            )}

            {/* Items */}
            <div className="divide-y divide-[var(--border-subtle)]">
              {group.items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex items-center gap-4 p-4"
                >
                  {/* /marketplace/{id} resolves a bare product id and 301s to
                      the canonical SEO URL. */}
                  <Link
                    href={`/marketplace/${item.productId}`}
                    className="w-16 h-16 rounded-lg bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {item.imageUrl ? (
                      // Remote product image of unknown intrinsic size — next/image
                      // would need remotePatterns plus a fixed-size wrapper here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-contain p-1 rounded-lg"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/marketplace/${item.productId}`}
                      className="block text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--amber-dark)] hover:underline transition-colors"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {item.boxPackQty && item.boxPackQty > 1
                        ? `${formatPrice(item.unitPrice * item.boxPackQty, item.currency)} / box · MOQ: ${Math.round(item.moq / item.boxPackQty).toLocaleString()} boxes`
                        : `${formatPrice(item.unitPrice, item.currency)} / unit · MOQ: ${item.moq.toLocaleString()}`}
                    </p>
                  </div>

                  {/* Quantity — typed or stepped, in boxes when boxPackQty is set */}
                  <QuantityStepper
                    quantity={item.quantity}
                    moq={item.moq}
                    boxPackQty={item.boxPackQty}
                    onChange={(pieces) =>
                      updateQuantity(item.productId, pieces, item.variantId)
                    }
                  />

                  <div className="text-right shrink-0 w-24">
                    <p className="text-sm font-semibold text-[var(--obsidian)]">
                      {formatPrice(item.unitPrice * item.quantity, item.currency)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Group subtotal */}
            <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-tertiary)]">Shipment subtotal</span>
              <span
                className={`text-sm font-semibold ${
                  group.meetsMinimum ? "text-[var(--obsidian)]" : "text-amber-600"
                }`}
              >
                {formatPrice(group.subtotal, group.currency)}
                {!group.meetsMinimum && (
                  <span className="ml-1.5 text-xs font-normal text-amber-500">
                    / {formatPrice(PLATFORM_MIN_GROUP_ORDER_VALUE, "USD")} min
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}

      {/* Order summary */}
      <div className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[var(--text-secondary)]">
            {t("subtotal")} ({items.length} items)
          </span>
          <span
            className="text-xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPrice(total, currency)}
          </span>
        </div>

        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          {checkoutEnabled
            ? "Shipping and taxes calculated at checkout"
            : "Freight, duties and taxes are confirmed on your quotation before anything is payable."}
        </p>

        {anyBelowMinimum && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-snug">
              One or more shipments haven&apos;t reached the minimum order value.
              Add more items from those suppliers before checking out or
              requesting quotes.
            </p>
          </div>
        )}

        {/* Self-serve checkout is switched off (CHECKOUT_FEATURES.checkout) —
            an RFQ is the only way out of the cart, so the quote request takes
            the primary slot the checkout button would otherwise hold. */}
        {checkoutEnabled ? (
          anyBelowMinimum ? (
            <Button className="w-full" disabled>
              {t("checkout")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Link href="/checkout">
              <Button className="w-full">
                {t("checkout")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )
        ) : (
          !rfqOpen &&
          rfqStatus !== "success" && (
            <Button
              className="w-full"
              onClick={() => setRfqOpen(true)}
              disabled={anyBelowMinimum}
            >
              <MessageSquare className="w-4 h-4" />
              Request a quotation
            </Button>
          )
        )}

        {/* RFQ panel */}
        <div
          id="request-quote"
          ref={rfqPanelRef}
          className="mt-4 pt-4 border-t border-[var(--border-subtle)]"
        >
          {rfqStatus === "success" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                RFQs sent to {createdRfqs.length} supplier{createdRfqs.length > 1 ? "s" : ""}
              </div>
              <ul className="space-y-1">
                {createdRfqs.map((r) => (
                  <li key={r.rfqId} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">
                      {r.supplierName} — <span className="font-mono">{r.rfqNumber}</span>
                    </span>
                    <Link
                      href={`/dashboard/rfq/${r.rfqId}`}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
              {signedIn === false ? (
                // A guest has no dashboard to link to — the quote comes back
                // by email, so offer the account that would let them track it.
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    We&apos;ve emailed a copy to{" "}
                    <span className="font-medium">{guestEmail}</span>. Our team will
                    reply with quotes shortly.
                  </p>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/auth/register">
                      <FileText className="w-4 h-4" />
                      Create an account to track it
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button asChild className="w-full mt-3">
                  <Link
                    href={
                      createdRfqs.length === 1
                        ? `/dashboard/rfq/${createdRfqs[0].rfqId}`
                        : "/dashboard/rfq"
                    }
                  >
                    <FileText className="w-4 h-4" />
                    {createdRfqs.length === 1 ? "View RFQ" : "View my RFQs"}
                  </Link>
                </Button>
              )}
            </div>
          ) : rfqOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-[var(--text-primary)]">
                Request quotes from all suppliers in your cart
              </p>

              {/* Signed-out visitors submit as guests — we need a way to
                  send the quote back to them. */}
              {signedIn === false && (
                <div className="space-y-3 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                  {/* Sign-in first: an account holder shouldn't retype details
                      we already have. The cart lives in localStorage, so it
                      survives the round trip. */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        Already have an account?
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        Sign in and we&apos;ll use your saved details. Your cart is kept.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link href={`/auth/login?redirect=${encodeURIComponent("/cart?rfq=1")}`}>
                        <LogIn className="w-3.5 h-3.5" />
                        Sign in
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                    <span className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                      or continue as a guest
                    </span>
                    <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    No account needed — just tell us where to send your quote.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Your name *"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email *"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                    <input
                      type="text"
                      placeholder="Company (optional)"
                      value={guestCompany}
                      onChange={(e) => setGuestCompany(e.target.value)}
                      className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                </div>
              )}

              <textarea
                placeholder="Optional note to suppliers (e.g. required certifications, delivery timeline, preferred specs)…"
                value={rfqNote}
                onChange={(e) => setRfqNote(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rfqCountry}
                  onChange={(e) => setRfqCountry(e.target.value)}
                  className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)]"
                >
                  <option value="">Deliver to country…</option>
                  {DESTINATION_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Delivery city (e.g. Accra)"
                  value={rfqCity}
                  onChange={(e) => setRfqCity(e.target.value)}
                  className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                  Quote deadline
                </label>
                <input
                  type="date"
                  value={rfqDeadline}
                  onChange={(e) => setRfqDeadline(e.target.value)}
                  className="flex-1 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)]"
                />
              </div>
              {rfqStatus === "error" && rfqError && (
                <p className="text-xs text-red-600">{rfqError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setRfqOpen(false); setRfqStatus("idle"); setRfqError(null); }}
                  disabled={rfqStatus === "loading"}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendRfq}
                  disabled={rfqStatus === "loading" || anyBelowMinimum || missingGuestDetails}
                  className="flex-1"
                >
                  {rfqStatus === "loading" ? (
                    "Sending…"
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send RFQs
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // With checkout off the primary button above already opens this
            // panel — a second trigger saying "instead" would be nonsense.
            checkoutEnabled && (
              <button
                onClick={() => setRfqOpen(true)}
                disabled={anyBelowMinimum}
                className="w-full text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[var(--border-default)] hover:border-[var(--amber)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-secondary)]"
              >
                <MessageSquare className="w-4 h-4" />
                Request quotes from suppliers instead
              </button>
            )
          )}

          {/* Always reachable for account holders. Hidden for guests, whose
              RFQs live in their inbox rather than a dashboard. */}
          {signedIn !== false && (
            <Button variant="outline" asChild className="w-full mt-3">
              <Link href="/dashboard/rfq">
                <FileText className="w-4 h-4" />
                View my RFQs &amp; quotations
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary above it (see next docs:
// 01-app/03-api-reference/04-functions/use-search-params.md#prerendering)
export default function CartPage() {
  return (
    <>
      {/* Public route — guests build a cart and request a quote without an
          account, so this page carries the marketing navbar/footer rather
          than the dashboard shell. */}
      <Navbar />
      <main className="pt-[104px] lg:pt-[140px] pb-20 px-6 lg:px-10 min-h-screen bg-[var(--surface-secondary)]">
        <Suspense fallback={null}>
          <CartPageContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
