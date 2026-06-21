import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";
import { DISPUTE_WINDOW_HOURS } from "@/lib/pipeline/config";

/**
 * dispute_window.opened
 * Opens a 72-hour window for buyer to raise disputes before settlement is released.
 * Schedules automatic closure by re-queuing dispute_window.closed 72h later.
 */
export const handler: EventHandler = async (event, _supabase) => {
  const { shipment_id, supplier_order_id, purchase_order_id } = event;

  await logActivity({
    activityType: "dispute_window_opened",
    description:  `72-hour dispute window opened for order ${supplier_order_id ?? purchase_order_id}`,
    targetType:   purchase_order_id ? "purchase_order" : "supplier_order",
    targetId:     purchase_order_id ?? supplier_order_id ?? undefined,
    metadata:     { supplierOrderId: supplier_order_id, shipmentId: shipment_id, windowHours: DISPUTE_WINDOW_HOURS },
  }).catch(() => {});

  const p = event.payload as { deliveredAt?: string };
  const deliveredMs = p.deliveredAt ? new Date(p.deliveredAt).getTime() : Date.now();
  const closeAt = new Date(deliveredMs + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  return {
    success: true,
    result:  { windowHours: DISPUTE_WINDOW_HOURS, closesAt: closeAt },
    nextEvents: [{
      eventType:       "dispute_window.closed",
      shipmentId:      shipment_id ?? undefined,
      supplierOrderId: supplier_order_id ?? undefined,
      purchaseOrderId: purchase_order_id ?? undefined,
      nextRetryAt:     closeAt,
    }],
  };
};
