import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedItem {
  productId: string;
  productName: string;
  supplierName: string;
  imageUrl: string | null;
  basePrice: number;
  currency: string;
  savedAt: string;
}

interface SavedStore {
  items: SavedItem[];
  addItem: (item: Omit<SavedItem, "savedAt">) => void;
  removeItem: (productId: string) => void;
  isSaved: (productId: string) => boolean;
  clearAll: () => void;
}

export const useSavedStore = create<SavedStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.productId === item.productId)) return state;
          return { items: [...state.items, { ...item, savedAt: new Date().toISOString() }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      isSaved: (productId) => get().items.some((i) => i.productId === productId),
      clearAll: () => set({ items: [] }),
    }),
    { name: "silk-road-saved" }
  )
);
