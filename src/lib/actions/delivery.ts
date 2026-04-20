"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateSettlement } from "@/lib/settlement/engine";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function confirmDelivery(
  supplierOrderId: string,
  confirmedBy: string
): Promise<ActionResult<{ settlementId: string }>> {
  const supabase = await createClient();

  // Verify order is in a deliverable state
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("status, purchase_order_id")
    .eq("id", supplierOrderId)
    .single();

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  const deliverableStatuses = ["dispatched", "in_transit", "out_for_delivery"];
  if (!deliverableStatuses.includes(order.status)) {
    return { success: false, error: `Cannot confirm delivery for order in status: ${order.status}` };
  }

  // Update supplier order to delivered
  await supabase
    .from("supplier_orders")
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", supplierOrderId);

  // Record status history
  await supabase.from("order_status_history").insert({
    supplier_order_id: supplierOrderId,
    from_status: order.status,
    to_status: "delivered",
    changed_by: confirmedBy,
    note: "Delivery confirmed by buyer",
  });

  // Check if all supplier orders for this purchase order are delivered
  const { data: allSupplierOrders } = await supabase
    .from("supplier_orders")
    .select("status")
    .eq("purchase_order_id", order.purchase_order_id);

  const allDelivered = allSupplierOrders?.every((so) => so.status === "delivered" || so.status === "completed");

  if (allDelivered) {
    await supabase
      .from("purchase_orders")
      .update({ status: "delivered", updated_at: new Date().toISOString() })
      .eq("id", order.purchase_order_id);
  }

  // Trigger settlement calculation
  const settlementResult = await calculateSettlement(supplierOrderId);

  if (!settlementResult.success) {
    // Settlement failed but delivery is confirmed — admin will handle manually
    return { success: true, data: { settlementId: "" } };
  }

  return { success: true, data: { settlementId: settlementResult.data!.settlementId } };
}
