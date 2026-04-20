"use client";

import { useSavedStore } from "@/stores/saved";
import { useCartStore } from "@/stores/cart";
import Link from "next/link";
import {
  Heart,
  ShoppingCart,
  Trash2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export default function SavedItemsPage() {
  const { items, removeItem, clearAll } = useSavedStore();
  const addToCart = useCartStore((s) => s.addItem);

  const handleAddToCart = (item: typeof items[0]) => {
    addToCart({
      productId: item.productId,
      supplierId: "",
      supplierName: item.supplierName,
      productName: item.productName,
      unitPrice: item.basePrice,
      quantity: 1,
      currency: item.currency,
      moq: 1,
      imageUrl: item.imageUrl || undefined,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Saved Items
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {items.length} product{items.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        {items.length > 0 && (
          <button onClick={clearAll} className="text-xs font-medium" style={{ color: "var(--danger)" }}>
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <Heart className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No saved items</p>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-tertiary)" }}>
            Browse the marketplace and save products you&apos;re interested in.
          </p>
          <Link href="/marketplace" className="btn-primary text-sm">Browse Marketplace</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.productId} className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
              <div className="h-40 bg-[var(--surface-secondary)] flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10" style={{ color: "var(--text-tertiary)" }} />
                )}
              </div>
              <div className="p-4">
                <Link href={`/marketplace/${item.productId}`} className="text-sm font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                  {item.productName}
                </Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.supplierName}</p>
                <p className="text-lg font-bold mt-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {item.currency} {(item.basePrice / 100).toFixed(2)}
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAddToCart(item)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--obsidian)", color: "var(--ivory)" }}>
                    <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                  </button>
                  <button onClick={() => removeItem(item.productId)} className="p-2 rounded-lg" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
