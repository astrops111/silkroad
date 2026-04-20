"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
} from "lucide-react";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function CartPage() {
  const t = useTranslations("cart");
  const { items, removeItem, updateQuantity, getTotal, clearCart } =
    useCartStore();

  const supplierGroups = new Map<string, typeof items>();
  for (const item of items) {
    if (!supplierGroups.has(item.supplierId)) {
      supplierGroups.set(item.supplierId, []);
    }
    supplierGroups.get(item.supplierId)!.push(item);
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
        <p className="text-[var(--text-tertiary)] mb-6">
          {t("emptyDesc")}
        </p>
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

      {/* Items grouped by supplier */}
      {Array.from(supplierGroups).map(([supplierId, supplierItems]) => (
        <div
          key={supplierId}
          className="rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] overflow-hidden"
        >
          <div className="p-4 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {supplierItems[0].supplierName}
            </p>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {supplierItems.map((item) => (
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
                    {item.moq}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.quantity - 1,
                        item.variantId
                      )
                    }
                    className="w-8 h-8 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-secondary)]"
                    disabled={item.quantity <= item.moq}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-12 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.quantity + 1,
                        item.variantId
                      )
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
        </div>
      ))}

      {/* Summary */}
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
        <Link href="/checkout">
          <Button className="w-full">
            {t("checkout")}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
