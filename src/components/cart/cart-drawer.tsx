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
import { ShoppingCart, Package, Trash2 } from "lucide-react";

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
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cart ({items.length} {items.length === 1 ? "item" : "items"})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--surface-tertiary)] flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">Your cart is empty</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 space-y-5">
            {groups.map((group) => (
              <div key={group.supplierId}>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  {group.supplierName}
                </p>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-contain p-1 rounded-lg"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Qty {item.quantity.toLocaleString()} · {formatPrice(item.unitPrice * item.quantity, item.currency)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        aria-label={`Remove ${item.productName}`}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--terracotta)] transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter>
            <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)] mb-1">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
            <Button asChild onClick={closeCart}>
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
