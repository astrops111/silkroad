import type { EventHandler, PipelineEventType } from "./types";

// Stage 1 handlers (implemented)
import { handler as orderPaymentConfirmed } from "./handlers/order-payment-confirmed";
import { handler as orderSupplierNotified } from "./handlers/order-supplier-notified";
import { handler as orderSupplierShipped } from "./handlers/order-supplier-shipped";

// Handlers for Stages 2–5 are stubs until implemented in subsequent sprints.
// Stubs return success:true so the event is marked succeeded and doesn't
// block the queue. Replace each stub with the real handler as sprints progress.
const stub = (label: string): EventHandler =>
  async () => ({ success: true, result: { stub: label } });

const HANDLERS: Partial<Record<PipelineEventType, EventHandler>> = {
  // Stage 1
  "order.payment_confirmed":          orderPaymentConfirmed,
  "order.supplier_notified":          orderSupplierNotified,
  "order.supplier_shipped":           orderSupplierShipped,

  // Stage 2 — origin logistics (Sprint 3)
  "shipment.created":                 stub("shipment.created"),
  "shipment.freight_booked":          stub("shipment.freight_booked"),
  "shipment.export_customs_filed":    stub("shipment.export_customs_filed"),
  "shipment.export_cleared":          stub("shipment.export_cleared"),
  "shipment.origin_departed":         stub("shipment.origin_departed"),
  "shipment.arrived_destination":     stub("shipment.arrived_destination"),

  // Stage 3-4 — import customs (Sprint 4)
  "customs.arrival_notice_received":  stub("customs.arrival_notice_received"),
  "customs.entry_filed":              stub("customs.entry_filed"),
  "customs.duties_assessed":          stub("customs.duties_assessed"),
  "customs.duties_paid":              stub("customs.duties_paid"),
  "customs.cleared":                  stub("customs.cleared"),
  "customs.hold_opened":              stub("customs.hold_opened"),
  "customs.hold_resolved":            stub("customs.hold_resolved"),

  // Stage 5 — last-mile delivery (Sprint 5)
  "delivery.scheduled":               stub("delivery.scheduled"),
  "delivery.picked_up":               stub("delivery.picked_up"),
  "delivery.completed":               stub("delivery.completed"),
  "dispute_window.opened":            stub("dispute_window.opened"),
  "dispute_window.closed":            stub("dispute_window.closed"),

  // Cross-cutting alerts
  "shipment.stalled":                 stub("shipment.stalled"),
  "customs.demurrage_warning":        stub("customs.demurrage_warning"),
  "settlement.triggered":             stub("settlement.triggered"),
};

export function getHandler(eventType: PipelineEventType): EventHandler | null {
  return HANDLERS[eventType] ?? null;
}
