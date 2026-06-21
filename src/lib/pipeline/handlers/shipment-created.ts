import type { EventHandler } from "../types";

/**
 * shipment.created
 *
 * Fires immediately when a b2b_shipments record is inserted (DB trigger).
 * Records the milestone in the shipment tracking timeline.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("shipment_number, shipping_method, delivery_country")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type: "shipment_created",
    description: `Shipment ${shipment.shipment_number} created — ${shipment.shipping_method} to ${shipment.delivery_country}. Awaiting freight booking.`,
  });

  return {
    success: true,
    result: { shipmentNumber: shipment.shipment_number, shippingMethod: shipment.shipping_method },
  };
};
