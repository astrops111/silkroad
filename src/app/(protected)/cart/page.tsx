"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/stores/cart";
import {
  PLATFORM_MIN_GROUP_ORDER_VALUE,
  shippingModeLabel,
} from "@/lib/logistics/rates/config";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function CartPage() {
  const t = useTranslations("cart");
  const { items, removeItem, updateQuantity, getTotal, clearCart, getItemsByShippingGroup } =
    useCartStore();

  // Recompute only when items change, not on every re-render (qty updates etc.)
  const shippingGroups = useMemo(() => getItemsByShippingGroup(), [items, getItemsByShippingGroup]);
  const anyBelowMinimum = shippingGroups.some((g) => !g.meetsMinimum);

  // RFQ panel state
  const [rfqOpen, setRfqOpen] = useState(false);
  const [rfqNote, setRfqNote] = useState("");
  const [rfqDeadline, setRfqDeadline] = useState("");
  const [rfqStatus, setRfqStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rfqError, setRfqError] = useState<string | null>(null);
  const [createdRfqs, setCreatedRfqs] = useState<
    { rfqId: string; rfqNumber: string; supplierName: string }[]
  >([]);

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
        <Link href="/marketplace">
          <Button>
            <Package className="w-4 h-4" />
            Browse Products
          </Button>
        </Link>
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
                  <div className="w-16 h-16 rounded-lg bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {formatPrice(item.unitPrice, item.currency)} / unit · MOQ:{" "}
                      {item.moq.toLocaleString()}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1, item.variantId)
                      }
                      className="w-8 h-8 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)] disabled:opacity-40"
                      disabled={item.quantity <= item.moq}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-12 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1, item.variantId)
                      }
                      className="w-8 h-8 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

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
          Shipping and taxes calculated at checkout
        </p>

        {anyBelowMinimum && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-snug">
              One or more shipments haven&apos;t reached the minimum order value.
              Add more items from those suppliers before checking out.
            </p>
          </div>
        )}

        {anyBelowMinimum ? (
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
        )}

        {/* RFQ panel */}
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
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
                      href="/dashboard/rfq"
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : rfqOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-[var(--text-primary)]">
                Request quotes from all suppliers in your cart
              </p>
              <textarea
                placeholder="Optional note to suppliers (e.g. required certifications, delivery timeline, preferred specs)…"
                value={rfqNote}
                onChange={(e) => setRfqNote(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
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
                  disabled={rfqStatus === "loading"}
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
            <button
              onClick={() => setRfqOpen(true)}
              className="w-full text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[var(--border-default)] hover:border-[var(--amber)] hover:text-[var(--text-primary)] transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Request quotes from suppliers instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
