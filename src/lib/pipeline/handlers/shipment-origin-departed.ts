import type { EventHandler } from "../types";
import { onShipmentDispatched } from "@/lib/email/events";

/**
 * shipment.origin_departed
 * Fires when vessel/aircraft departs origin port.
 * Transitions shipment to 'dispatched', sends buyer email.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { port?: string; vesselName?: string; voyageNo?: string };
  const now = new Date().toISOString();

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("status, shipment_number")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  const alreadyDispatched = ["dispatched", "in_transit", "at_hub", "out_for_delivery", "delivered"]
    .includes(shipment.status as string);

  if (!alreadyDispatched) {
    await supabase
      .from("b2b_shipments")
      .update({ status: "dispatched", dispatched_at: now, updated_at: now })
      .eq("id", shipment_id);
  }

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type: "origin_departed",
    description: [
      `${shipment.shipment_number} departed origin`,
      p.port       && `port: ${p.port}`,
      p.vesselName && `vessel: ${p.vesselName}`,
      p.voyageNo   && `voyage: ${p.voyageNo}`,
    ].filter(Boolean).join(" — "),
  });

  await onShipmentDispatched(shipment_id)
    .catch((err) => console.error("[pipeline:shipment.origin_departed] Buyer email failed:", err));

  return {
    success: true,
    result: { shipmentNumber: shipment.shipment_number, dispatched: !alreadyDispatched },
  };
};
