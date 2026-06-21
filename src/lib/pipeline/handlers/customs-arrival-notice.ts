import type { EventHandler } from "../types";

/**
 * customs.arrival_notice_received
 * Fires when shipment arrives at destination hub.
 * Sets customs_status = 'preparing' — ops begins document preparation.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const now = new Date().toISOString();

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("customs_status, shipment_number")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  // Only advance if not already past 'preparing'
  if (shipment.customs_status === "pending") {
    await supabase
      .from("b2b_shipments")
      .update({ customs_status: "preparing", updated_at: now })
      .eq("id", shipment_id);
  }

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_arrival_notice",
    description: `Arrival notice received for ${shipment.shipment_number}. Customs preparation started.`,
  });

  return {
    success: true,
    result: { shipmentId: shipment_id, customsStatus: "preparing" },
  };
};
