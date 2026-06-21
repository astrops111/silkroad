import type { EventHandler } from "../types";

/**
 * order.supplier_notified
 *
 * Triggered when supplier_order transitions to 'confirmed'.
 * Supplier now knows to prepare goods for dispatch to the platform's
 * freight agent.
 *
 * This is a waiting state — the next automated step is
 * order.supplier_shipped, triggered when ops sets status = 'ready_to_ship'.
 * The monitor cron raises shipment.stalled if no progress within SLA.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { supplier_order_id } = event;
  if (!supplier_order_id) {
    return { success: false, error: "Missing supplier_order_id" };
  }

  const { data: order, error } = await supabase
    .from("supplier_orders")
    .select("id, order_number, supplier_id, estimated_ship_date")
    .eq("id", supplier_order_id)
    .single();

  if (error || !order) {
    return { success: false, error: `Order fetch failed: ${error?.message}` };
  }

  // Annotate the order so ops can see the SLA deadline.
  // The monitor cron compares estimated_ship_date to now() when
  // checking for stalled orders.
  await supabase
    .from("supplier_orders")
    .update({
      note: [
        "[PIPELINE] Awaiting supplier dispatch to platform freight agent.",
        order.estimated_ship_date
          ? `Expected ship date: ${order.estimated_ship_date}`
          : "No estimated ship date recorded.",
      ].join(" "),
    })
    .eq("id", supplier_order_id);

  return {
    success: true,
    result: {
      orderNumber: order.order_number,
      supplierId: order.supplier_id,
      estimatedShipDate: order.estimated_ship_date,
    },
  };
};
