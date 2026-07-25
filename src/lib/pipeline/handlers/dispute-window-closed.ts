import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";

/**
 * dispute_window.closed
 * Fires 72 hours after dispute_window.opened (scheduled via nextRetryAt).
 * Signals that the buyer dispute window has elapsed. This is the order's
 * true terminal state — bump 'delivered' to 'completed' here so the manual
 * admin settlement-creation endpoint (which only looks at 'completed' orders)
 * can actually find them, and so a completed order is no longer eligible for
 * a fresh dispute. The settlement.triggered event (from DB trigger on
 * supplier_order 'delivered') will check elapsed time before processing payout.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { supplier_order_id, purchase_order_id } = event;

  if (supplier_order_id) {
    const { data: order } = await supabase
      .from("supplier_orders")
      .select("status, purchase_order_id")
      .eq("id", supplier_order_id)
      .single();

    if (order?.status === "delivered") {
      await supabase
        .from("supplier_orders")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", supplier_order_id);

      await supabase.from("order_status_history").insert({
        supplier_order_id,
        from_status: "delivered",
        to_status: "completed",
        reason: "Dispute window closed with no open dispute",
      });

      const poId = order.purchase_order_id;
      if (poId) {
        const { data: siblings } = await supabase
          .from("supplier_orders")
          .select("status")
          .eq("purchase_order_id", poId);

        const allCompleted = siblings?.every((s) => s.status === "completed");
        if (allCompleted) {
          await supabase
            .from("purchase_orders")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", poId);
        }
      }
    }
  }

  await logActivity({
    activityType: "dispute_window_closed",
    description:  `Dispute window closed for order ${supplier_order_id ?? purchase_order_id}. Settlement may proceed.`,
    targetType:   purchase_order_id ? "purchase_order" : "supplier_order",
    targetId:     purchase_order_id ?? supplier_order_id ?? undefined,
    metadata:     { supplierOrderId: supplier_order_id },
  }).catch(() => {});

  return {
    success: true,
    result: { disputeWindowClosed: true, supplierOrderId: supplier_order_id },
    nextEvents: supplier_order_id ? [{
      eventType:       "settlement.triggered" as const,
      supplierOrderId: supplier_order_id,
      idempotencyKey:  `settlement.triggered:dispute_close:${supplier_order_id}`,
      payload:         { triggeredByDisputeClose: true },
    }] : [],
  };
};
