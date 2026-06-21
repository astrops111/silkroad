import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shippingGroupKey, PLATFORM_MIN_GROUP_ORDER_VALUE } from "@/lib/logistics/rates/config";

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
  volumeCbm?: number;
  shippingMode?: string;
}

export interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
}

export interface ShippingGroup {
  groupKey: string;
  supplierId: string;
  supplierName: string;
  shippingMode: string | undefined;
  items: CartItem[];
  subtotal: number;
  totalActualWeightKg: number; // raw sum of item.weightKg * qty — NOT chargeable weight
  totalVolumeCbm: number;
  currency: string;
  meetsMinimum: boolean;  // subtotal >= PLATFORM_MIN_GROUP_ORDER_VALUE
  shortfallMinor: number; // how much more to add to meet minimum (0 if already met)
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
  getItemsByShippingGroup: () => ShippingGroup[];
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

      getItemsByShippingGroup: () => {
        const { items } = get();
        const groups: Record<string, ShippingGroup> = {};

        for (const item of items) {
          const key = shippingGroupKey(item.supplierId, item.shippingMode);
          if (!groups[key]) {
            groups[key] = {
              groupKey: key,
              supplierId: item.supplierId,
              supplierName: item.supplierName,
              shippingMode: item.shippingMode,
              items: [],
              subtotal: 0,
              totalActualWeightKg: 0,
              totalVolumeCbm: 0,
              currency: item.currency,
              meetsMinimum: false,
              shortfallMinor: 0,
            };
          }
          const g = groups[key];
          g.items.push(item);
          g.subtotal += item.unitPrice * item.quantity;
          g.totalActualWeightKg += (item.weightKg ?? 0) * item.quantity;
          g.totalVolumeCbm += (item.volumeCbm ?? 0) * item.quantity;
        }

        for (const g of Object.values(groups)) {
          g.meetsMinimum = g.subtotal >= PLATFORM_MIN_GROUP_ORDER_VALUE;
          g.shortfallMinor = g.meetsMinimum ? 0 : PLATFORM_MIN_GROUP_ORDER_VALUE - g.subtotal;
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
