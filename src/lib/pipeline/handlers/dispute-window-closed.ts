import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";

/**
 * dispute_window.closed
 * Fires 72 hours after dispute_window.opened (scheduled via nextRetryAt).
 * Signals that the buyer dispute window has elapsed.
 * The settlement.triggered event (from DB trigger on supplier_order 'delivered')
 * will check elapsed time before processing payout.
 */
export const handler: EventHandler = async (event, _supabase) => {
  const { supplier_order_id, purchase_order_id } = event;

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
