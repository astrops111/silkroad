import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/stores/cart";
import { useSavedStore } from "@/stores/saved";

describe("CartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("adds an item to cart", () => {
    useCartStore.getState().addItem({
      productId: "p1",
      supplierId: "s1",
      supplierName: "Supplier A",
      productName: "Widget",
      unitPrice: 1000,
      quantity: 5,
      currency: "USD",
      moq: 1,
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].productName).toBe("Widget");
  });

  it("updates quantity of existing item", () => {
    const store = useCartStore.getState();
    store.addItem({
      productId: "p1",
      supplierId: "s1",
      supplierName: "Supplier A",
      productName: "Widget",
      unitPrice: 1000,
      quantity: 5,
      currency: "USD",
      moq: 1,
    });

    store.updateQuantity("p1", 10, undefined);
    expect(useCartStore.getState().items[0].quantity).toBe(10);
  });

  it("removes item from cart", () => {
    const store = useCartStore.getState();
    store.addItem({
      productId: "p1",
      supplierId: "s1",
      supplierName: "Supplier A",
      productName: "Widget",
      unitPrice: 1000,
      quantity: 5,
      currency: "USD",
      moq: 1,
    });

    store.removeItem("p1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("calculates total correctly", () => {
    const store = useCartStore.getState();
    store.addItem({
      productId: "p1",
      supplierId: "s1",
      supplierName: "A",
      productName: "Item 1",
      unitPrice: 1000,
      quantity: 3,
      currency: "USD",
      moq: 1,
    });
    store.addItem({
      productId: "p2",
      supplierId: "s1",
      supplierName: "A",
      productName: "Item 2",
      unitPrice: 500,
      quantity: 2,
      currency: "USD",
      moq: 1,
    });

    expect(useCartStore.getState().getTotal()).toBe(4000); // 3000 + 1000
  });

  it("groups items by supplier", () => {
    const store = useCartStore.getState();
    store.addItem({ productId: "p1", supplierId: "s1", supplierName: "A", productName: "X", unitPrice: 100, quantity: 1, currency: "USD", moq: 1 });
    store.addItem({ productId: "p2", supplierId: "s2", supplierName: "B", productName: "Y", unitPrice: 200, quantity: 1, currency: "USD", moq: 1 });
    store.addItem({ productId: "p3", supplierId: "s1", supplierName: "A", productName: "Z", unitPrice: 300, quantity: 1, currency: "USD", moq: 1 });

    const grouped = useCartStore.getState().getItemsBySupplier();
    expect(grouped).toHaveLength(2);
    const s1Group = grouped.find((g) => g.supplierId === "s1");
    const s2Group = grouped.find((g) => g.supplierId === "s2");
    expect(s1Group?.items).toHaveLength(2);
    expect(s2Group?.items).toHaveLength(1);
  });

  it("clears all items", () => {
    const store = useCartStore.getState();
    store.addItem({ productId: "p1", supplierId: "s1", supplierName: "A", productName: "X", unitPrice: 100, quantity: 1, currency: "USD", moq: 1 });
    store.clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("SavedStore", () => {
  beforeEach(() => {
    useSavedStore.setState({ items: [] });
  });

  it("saves an item", () => {
    useSavedStore.getState().addItem({
      productId: "p1",
      productName: "Widget",
      supplierName: "Supplier A",
      imageUrl: null,
      basePrice: 1000,
      currency: "USD",
    });

    expect(useSavedStore.getState().items).toHaveLength(1);
    expect(useSavedStore.getState().isSaved("p1")).toBe(true);
  });

  it("does not duplicate saved items", () => {
    const item = { productId: "p1", productName: "W", supplierName: "A", imageUrl: null, basePrice: 100, currency: "USD" };
    useSavedStore.getState().addItem(item);
    useSavedStore.getState().addItem(item);
    expect(useSavedStore.getState().items).toHaveLength(1);
  });

  it("removes saved item", () => {
    useSavedStore.getState().addItem({ productId: "p1", productName: "W", supplierName: "A", imageUrl: null, basePrice: 100, currency: "USD" });
    useSavedStore.getState().removeItem("p1");
    expect(useSavedStore.getState().isSaved("p1")).toBe(false);
  });
});
