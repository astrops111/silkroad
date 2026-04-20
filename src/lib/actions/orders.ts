"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CartItem } from "@/stores/cart";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createOrder(
  buyerUserId: string,
  buyerCompanyId: string,
  items: CartItem[],
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  }
): Promise<ActionResult<{ purchaseOrderId: string }>> {
  const serviceClient = createServiceClient();

  // Group items by supplier
  const supplierGroups = new Map<string, CartItem[]>();
  for (const item of items) {
    if (!supplierGroups.has(item.supplierId)) {
      supplierGroups.set(item.supplierId, []);
    }
    supplierGroups.get(item.supplierId)!.push(item);
  }

  // Calculate totals
  const totalAmount = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const currency = items[0]?.currency ?? "USD";

  // 1. Create purchase order
  const orderNumber = `PO-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const { data: purchaseOrder, error: poError } = await serviceClient
    .from("purchase_orders")
    .insert({
      order_number: orderNumber,
      buyer_user_id: buyerUserId,
      buyer_company_id: buyerCompanyId,
      status: "pending_payment",
      total_amount: totalAmount,
      currency,
      shipping_address: shippingAddress,
      item_count: items.length,
    })
    .select("id")
    .single();

  if (poError || !purchaseOrder) {
    return {
      success: false,
      error: poError?.message ?? "Failed to create order",
    };
  }

  // 2. Create supplier orders for each supplier
  for (const [supplierId, supplierItems] of supplierGroups) {
    const supplierTotal = supplierItems.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0
    );

    const { data: supplierOrder, error: soError } = await serviceClient
      .from("supplier_orders")
      .insert({
        purchase_order_id: purchaseOrder.id,
        supplier_company_id: supplierId,
        status: "pending_payment",
        subtotal: supplierTotal,
        total_amount: supplierTotal,
        currency,
      })
      .select("id")
      .single();

    if (soError || !supplierOrder) continue;

    // 3. Create line items
    const lineItems = supplierItems.map((item) => ({
      supplier_order_id: supplierOrder.id,
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      currency,
    }));

    await serviceClient.from("supplier_order_items").insert(lineItems);

    // 4. Create initial status history
    await serviceClient.from("order_status_history").insert({
      supplier_order_id: supplierOrder.id,
      from_status: null,
      to_status: "pending_payment",
      changed_by: buyerUserId,
      note: "Order created",
    });
  }

  return { success: true, data: { purchaseOrderId: purchaseOrder.id } };
}

export async function updateSupplierOrderStatus(
  supplierOrderId: string,
  newStatus: string,
  changedBy: string,
  note?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current status
  const { data: current } = await supabase
    .from("supplier_orders")
    .select("status")
    .eq("id", supplierOrderId)
    .single();

  if (!current) {
    return { success: false, error: "Order not found" };
  }

  // Update status
  const { error: updateError } = await supabase
    .from("supplier_orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", supplierOrderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Record history
  await supabase.from("order_status_history").insert({
    supplier_order_id: supplierOrderId,
    from_status: current.status,
    to_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
  });

  return { success: true };
}
