import type { EventHandler } from "../types";

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

  return {
    success: true,
    result: { scheduledDate: p.scheduledDate, driverName: p.driverName },
  };
};
