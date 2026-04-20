import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  variantId?: string;
  supplierId: string;
  supplierName: string;
  productName: string;
  variantName?: string;
  unitPrice: number; // in minor units (cents)
  quantity: number;
  currency: string;
  moq: number;
  imageUrl?: string;
  weightKg?: number;
}

export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
}

interface CartState {
  items: CartItem[];

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  clearSupplier: (supplierId: string) => void;

  // Computed
  getItemsBySupplier: () => SupplierGroup[];
  getItemCount: () => number;
  getTotal: () => number;
  getSupplierCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId &&
              i.variantId === item.variantId
          );

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId &&
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }

          return { items: [...state.items, item] };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(i.productId === productId && i.variantId === variantId)
          ),
        })),

      updateQuantity: (productId, quantity, variantId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: Math.max(i.moq, quantity) }
              : i
          ),
        })),

      clearCart: () => set({ items: [] }),

      clearSupplier: (supplierId) =>
        set((state) => ({
          items: state.items.filter((i) => i.supplierId !== supplierId),
        })),

      getItemsBySupplier: () => {
        const { items } = get();
        const groups: Record<string, SupplierGroup> = {};

        for (const item of items) {
          if (!groups[item.supplierId]) {
            groups[item.supplierId] = {
              supplierId: item.supplierId,
              supplierName: item.supplierName,
              items: [],
              subtotal: 0,
              currency: item.currency,
            };
          }
          groups[item.supplierId].items.push(item);
          groups[item.supplierId].subtotal += item.unitPrice * item.quantity;
        }

        return Object.values(groups);
      },

      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

      getSupplierCount: () =>
        new Set(get().items.map((i) => i.supplierId)).size,
    }),
    { name: "silk-road-cart" }
  )
);
