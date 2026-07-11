import type { EventHandler } from "../types";
import { notifyShipmentMilestone } from "../milestone-notify";

/**
 * shipment.freight_booked
 *
 * Fires when a carrier assigns a booking reference (Bill of Lading / Air Waybill).
 * Payload: trackingNumber, trackingUrl, carrierRef, estimatedDepartureDate (ISO date).
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as {
    trackingNumber?: string;
    trackingUrl?: string;
    carrierRef?: string;
    estimatedDepartureDate?: string;
  };

  if (p.trackingNumber || p.trackingUrl) {
    await supabase
      .from("b2b_shipments")
      .update({
        tracking_number: p.trackingNumber ?? null,
        tracking_url:    p.trackingUrl    ?? null,
        updated_at:      new Date().toISOString(),
      })
      .eq("id", shipment_id);
  }

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "freight_booked",
    description: [
      "Freight booking confirmed",
      p.carrierRef           && `carrier ref: ${p.carrierRef}`,
      p.trackingNumber       && `tracking: ${p.trackingNumber}`,
      p.estimatedDepartureDate && `ETD: ${p.estimatedDepartureDate}`,
    ].filter(Boolean).join(" — "),
  });

  // Buyer email from logistic@ + deal-thread CRM activity (idempotent on retry)
  await notifyShipmentMilestone(supabase, {
    eventId: event.id,
    shipmentId: shipment_id,
    supplierOrderId: event.supplier_order_id,
    milestone: "freight_booked",
    headline: "Freight Booked",
    detail: [
      "your shipment's freight has been booked",
      p.carrierRef && `carrier ref ${p.carrierRef}`,
      p.estimatedDepartureDate && `estimated departure ${p.estimatedDepartureDate}`,
    ].filter(Boolean).join(", ") + ".",
  });

  return {
    success: true,
    result: { trackingNumber: p.trackingNumber, carrierRef: p.carrierRef },
  };
};
