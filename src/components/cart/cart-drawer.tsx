"use client";

import Link from "next/link";
import { useCartStore } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ShoppingCart, Package, Trash2, FileText } from "lucide-react";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function CartDrawer() {
  const isCartOpen = useCartStore((s) => s.isCartOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const getItemsBySupplier = useCartStore((s) => s.getItemsBySupplier);
  const getTotal = useCartStore((s) => s.getTotal);

  const groups = getItemsBySupplier();
  const total = getTotal();
  const currency = items[0]?.currency ?? "USD";

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => (open ? undefined : closeCart())}>
      {/* h-[100dvh] overrides the sheet's h-full: on mobile, 100% of the
          layout viewport sits behind the browser's toolbars, which pushes the
          footer buttons under the chrome. dvh tracks the visible viewport. */}
      <SheetContent side="right" className="w-full sm:max-w-md h-[100dvh] overflow-hidden">
        <SheetHeader>
          {/* Count is distinct SKUs (varieties), not total pieces */}
          <SheetTitle>Cart ({items.length} {items.length === 1 ? "item" : "items"})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--surface-tertiary)] flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mb-5">Your cart is empty</p>
            {/* No footer renders when empty — keep RFQs reachable from here */}
            <Button variant="outline" asChild onClick={closeCart}>
              <Link href="/dashboard/rfq">
                <FileText className="w-4 h-4" />
                View my RFQs
              </Link>
            </Button>
          </div>
        ) : (
          // min-h-0 is load-bearing: a flex child defaults to min-height:auto,
          // so without it this list grows to its full content height instead of
          // scrolling, shoving SheetFooter — and its buttons — off the bottom
          // of the viewport.
          <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-5">
            {groups.map((group) => (
              <div key={group.supplierId}>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  {group.supplierName}
                </p>
                <div className="space-y-3">
                  {group.items.map((item) => {
                    const boxPackQty = item.boxPackQty ?? 1;
                    const boxed = boxPackQty > 1;
                    // Boxed SKUs are priced per piece in the store; show the box
                    // price and box count so the drawer matches /cart.
                    const displayQty = boxed
                      ? Math.round(item.quantity / boxPackQty)
                      : item.quantity;
                    const displayUnitPrice = item.unitPrice * (boxed ? boxPackQty : 1);
                    const unitLabel = boxed ? "box" : "pc";
                    const lineSubtotal = item.unitPrice * item.quantity;

                    return (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex items-start gap-3"
                      >
                        {/* /marketplace/{id} resolves a bare product id and
                            301s to the canonical SEO URL. */}
                        <Link
                          href={`/marketplace/${item.productId}`}
                          onClick={closeCart}
                          className="w-12 h-12 rounded-lg bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-full h-full object-contain p-1 rounded-lg"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/marketplace/${item.productId}`}
                            onClick={closeCart}
                            className="block text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--amber-dark)] hover:underline transition-colors"
                          >
                            {item.productName}
                          </Link>
                          {item.variantName && (
                            <p className="text-xs text-[var(--text-tertiary)] truncate">
                              {item.variantName}
                            </p>
                          )}
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {displayQty.toLocaleString()} {unitLabel}
                            {displayQty === 1 ? "" : "s"} ×{" "}
                            {formatPrice(displayUnitPrice, item.currency)}
                          </p>
                          {boxed && (
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {boxPackQty} pcs/box · {item.quantity.toLocaleString()} pcs total
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold text-[var(--obsidian)]">
                            {formatPrice(lineSubtotal, item.currency)}
                          </span>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            aria-label={`Remove ${item.productName}`}
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--terracotta)] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-tertiary)]">Subtotal</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {formatPrice(group.subtotal, group.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          // shrink-0 so a long item list can never squeeze the buttons away
          <SheetFooter className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]">
            <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)] mb-1">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
            <Button asChild onClick={closeCart}>
              <Link href="/cart?rfq=1">
                <FileText className="w-4 h-4" />
                View Quote
              </Link>
            </Button>
            <Button variant="outline" asChild onClick={closeCart}>
              <Link href="/cart">View Full Cart</Link>
            </Button>
            <Button variant="ghost" onClick={closeCart}>
              Continue Shopping
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
