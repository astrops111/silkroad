import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";

/**
 * customs.cleared
 * Fires when customs_status transitions to 'cleared' (DB trigger).
 * Clearance amounts are already recorded in DB by ops.
 * Handler kicks off the last-mile delivery workflow.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, supplier_order_id } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("customs_duty_paid_minor, customs_vat_paid_minor, customs_paid_currency, customs_declaration_no, shipment_number")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_cleared",
    description: [
      `${shipment.shipment_number} cleared customs`,
      shipment.customs_declaration_no  && `declaration: ${shipment.customs_declaration_no}`,
      shipment.customs_duty_paid_minor && `duty paid: ${shipment.customs_duty_paid_minor} ${shipment.customs_paid_currency}`,
    ].filter(Boolean).join(" — "),
  });

  await logActivity({
    activityType: "customs_cleared",
    description:  `Customs cleared for shipment ${shipment.shipment_number}`,
    targetType:   "shipment",
    targetId:     shipment_id,
    targetLabel:  shipment.shipment_number ?? shipment_id,
    metadata:     { shipmentId: shipment_id, declarationNo: shipment.customs_declaration_no },
  }).catch(() => {});

  return {
    success: true,
    result: { shipmentId: shipment_id, declarationNo: shipment.customs_declaration_no },
    nextEvents: [{
      eventType:       "delivery.scheduled",
      shipmentId:      shipment_id,
      supplierOrderId: supplier_order_id ?? undefined,
    }],
  };
};
