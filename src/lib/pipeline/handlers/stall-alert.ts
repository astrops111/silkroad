import type { EventHandler } from "../types";
import { logActivity, logSystemEvent } from "@/lib/logging";

/**
 * stall-alert — shared handler for shipment.stalled + customs.demurrage_warning
 *
 * shipment.stalled: supplier confirmed but not ready_to_ship after 14 days.
 * customs.demurrage_warning: goods arrived at port, free days running out.
 *
 * Ops must manually intervene. Handler records the alert in the activity log.
 */
export const handler: EventHandler = async (event, _supabase) => {
  const isShipmentStall = event.event_type === "shipment.stalled";
  const isDemurrageWarn = event.event_type === "customs.demurrage_warning";

  const targetId = event.purchase_order_id ?? event.supplier_order_id ?? event.shipment_id;
  const targetType = event.purchase_order_id ? "purchase_order"
    : event.supplier_order_id ? "supplier_order" : "shipment";

  const description = isShipmentStall
    ? "STALL — Supplier has not marked order ready to ship within 14-day SLA. Ops intervention required."
    : isDemurrageWarn
    ? "DEMURRAGE WARNING — Free days at port are expiring. Customs clearance overdue."
    : `ALERT — ${event.event_type}`;

  await Promise.all([
    logActivity({
      activityType: "order_stalled",
      description,
      targetType,
      targetId:    targetId ?? undefined,
      metadata:    { eventType: event.event_type, eventId: event.id, payload: event.payload },
    }),
    logSystemEvent({
      level:    "warn",
      source:   "pipeline-monitor",
      message:  description,
      metadata: { eventType: event.event_type, orderId: targetId },
    }),
  ]);

  return {
    success: true,
    result: { alerted: true, eventType: event.event_type },
  };
};
