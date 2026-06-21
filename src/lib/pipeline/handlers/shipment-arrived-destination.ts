import type { EventHandler } from "../types";

/**
 * shipment.arrived_destination
 * Fires when shipment arrives at destination port/hub.
 * Transitions to 'at_hub', auto-kicks off customs workflow.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, supplier_order_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { port?: string; freeDays?: number; arrivalDate?: string };
  const now = new Date().toISOString();

  await supabase
    .from("b2b_shipments")
    .update({ status: "at_hub", at_hub_since: now, updated_at: now })
    .eq("id", shipment_id)
    .in("status", ["dispatched", "in_transit"]);

  const { error: trackErr } = await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type: "arrived_destination",
    description: [
      "Arrived at destination port",
      p.port        && `port: ${p.port}`,
      p.freeDays    && `free days: ${p.freeDays}`,
      p.arrivalDate && `arrival: ${p.arrivalDate}`,
    ].filter(Boolean).join(" — "),
  });
  if (trackErr) console.error("[pipeline:shipment.arrived_destination] tracking insert failed:", trackErr.message);

  return {
    success: true,
    result: { shipmentId: shipment_id, port: p.port },
    nextEvents: [{
      eventType:       "customs.arrival_notice_received",
      shipmentId:      shipment_id,
      supplierOrderId: supplier_order_id ?? undefined,
      payload:         { port: p.port, freeDays: p.freeDays, arrivedAt: now },
    }],
  };
};
