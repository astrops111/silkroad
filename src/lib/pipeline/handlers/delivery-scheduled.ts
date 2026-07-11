import type { EventHandler } from "../types";
import { notifyShipmentMilestone } from "../milestone-notify";

/**
 * delivery.scheduled
 * Fires after customs clearance when the last-mile delivery is booked.
 * Payload: scheduledDate (ISO), driverName, vehicleRef.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { scheduledDate?: string; driverName?: string; vehicleRef?: string };

  if (p.scheduledDate) {
    await supabase
      .from("b2b_shipments")
      .update({ pickup_scheduled_at: p.scheduledDate, updated_at: new Date().toISOString() })
      .eq("id", shipment_id);
  }

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "delivery_scheduled",
    description: [
      "Delivery scheduled",
      p.scheduledDate && `date: ${p.scheduledDate}`,
      p.driverName    && `driver: ${p.driverName}`,
      p.vehicleRef    && `vehicle: ${p.vehicleRef}`,
    ].filter(Boolean).join(" — "),
  });

  // Buyer email from logistic@ + deal-thread CRM activity (idempotent on retry)
  await notifyShipmentMilestone(supabase, {
    eventId: event.id,
    shipmentId: shipment_id,
    supplierOrderId: event.supplier_order_id,
    milestone: "delivery_scheduled",
    headline: "Delivery Scheduled",
    detail: p.scheduledDate
      ? `your delivery is scheduled for ${new Date(p.scheduledDate).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}.`
      : "your delivery has been scheduled.",
  });

  return {
    success: true,
    result: { scheduledDate: p.scheduledDate, driverName: p.driverName },
  };
};
