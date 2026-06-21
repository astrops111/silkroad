import type { EventHandler } from "../types";

/**
 * delivery.picked_up
 * Last-mile driver picks up goods from warehouse for delivery.
 * Transitions shipment to 'out_for_delivery'.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { driverId?: string; location?: string };
  const now = new Date().toISOString();

  await supabase
    .from("b2b_shipments")
    .update({ status: "out_for_delivery", picked_up_at: now, updated_at: now })
    .eq("id", shipment_id)
    .in("status", ["assigned", "driver_accepted", "picking", "packed", "dispatched", "in_transit", "at_hub"]);

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "delivery_picked_up",
    description: [
      "Out for delivery",
      p.location && `from: ${p.location}`,
      p.driverId && `driver: ${p.driverId}`,
    ].filter(Boolean).join(" — "),
  });

  return {
    success: true,
    result: { shipmentId: shipment_id, pickedUpAt: now },
  };
};
