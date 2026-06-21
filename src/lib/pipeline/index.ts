import type { EventHandler, PipelineEventType } from "./types";

// Stage 1
import { handler as orderPaymentConfirmed } from "./handlers/order-payment-confirmed";
import { handler as orderSupplierNotified } from "./handlers/order-supplier-notified";
import { handler as orderSupplierShipped }  from "./handlers/order-supplier-shipped";

// Stage 2 — origin logistics
import { handler as shipmentCreated }           from "./handlers/shipment-created";
import { handler as shipmentFreightBooked }      from "./handlers/shipment-freight-booked";
import { handler as shipmentOriginDeparted }     from "./handlers/shipment-origin-departed";
import { handler as shipmentArrivedDestination } from "./handlers/shipment-arrived-destination";

// Stage 3-4 — import customs
import { handler as customsArrivalNotice }  from "./handlers/customs-arrival-notice";
import { handler as customsEntryFiled }     from "./handlers/customs-entry-filed";
import { handler as customsDutiesAssessed } from "./handlers/customs-duties-assessed";
import { handler as customsDutiesPaid }     from "./handlers/customs-duties-paid";
import { handler as customsCleared }        from "./handlers/customs-cleared";
import { handler as customsHoldOpened }     from "./handlers/customs-hold-opened";
import { handler as customsHoldResolved }   from "./handlers/customs-hold-resolved";

// Stage 5 — last-mile delivery + settlement
import { handler as deliveryScheduled }   from "./handlers/delivery-scheduled";
import { handler as deliveryPickedUp }    from "./handlers/delivery-picked-up";
import { handler as deliveryCompleted }   from "./handlers/delivery-completed";
import { handler as disputeWindowOpened } from "./handlers/dispute-window-opened";
import { handler as disputeWindowClosed } from "./handlers/dispute-window-closed";
import { handler as settlementTriggered } from "./handlers/settlement-triggered";

// Cross-cutting alerts
import { handler as stallAlert } from "./handlers/stall-alert";

const stub = (label: string): EventHandler =>
  async () => ({ success: true, result: { stub: label } });

const HANDLERS: Partial<Record<PipelineEventType, EventHandler>> = {
  // Stage 1
  "order.payment_confirmed":          orderPaymentConfirmed,
  "order.supplier_notified":          orderSupplierNotified,
  "order.supplier_shipped":           orderSupplierShipped,

  // Stage 2 — origin logistics
  "shipment.created":                 shipmentCreated,
  "shipment.freight_booked":          shipmentFreightBooked,
  "shipment.export_customs_filed":    stub("shipment.export_customs_filed"),  // origin-country, handled by forwarder
  "shipment.export_cleared":          stub("shipment.export_cleared"),
  "shipment.origin_departed":         shipmentOriginDeparted,
  "shipment.arrived_destination":     shipmentArrivedDestination,

  // Stage 3-4 — import customs
  "customs.arrival_notice_received":  customsArrivalNotice,
  "customs.entry_filed":              customsEntryFiled,
  "customs.duties_assessed":          customsDutiesAssessed,
  "customs.duties_paid":              customsDutiesPaid,
  "customs.cleared":                  customsCleared,
  "customs.hold_opened":              customsHoldOpened,
  "customs.hold_resolved":            customsHoldResolved,

  // Stage 5 — last-mile delivery
  "delivery.scheduled":               deliveryScheduled,
  "delivery.picked_up":               deliveryPickedUp,
  "delivery.completed":               deliveryCompleted,
  "dispute_window.opened":            disputeWindowOpened,
  "dispute_window.closed":            disputeWindowClosed,

  // Cross-cutting alerts
  "shipment.stalled":                 stallAlert,
  "customs.demurrage_warning":        stallAlert,
  "settlement.triggered":             settlementTriggered,
};

export function getHandler(eventType: PipelineEventType): EventHandler | null {
  return HANDLERS[eventType] ?? null;
}
