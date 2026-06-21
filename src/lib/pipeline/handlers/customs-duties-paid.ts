import type { EventHandler } from "../types";

/**
 * customs.duties_paid
 * Platform has paid assessed import duties to customs authority.
 * Payload: dutyPaidMinor, vatPaidMinor, otherPaidMinor, currency, receiptRef.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as {
    dutyPaidMinor?:  number;
    vatPaidMinor?:   number;
    otherPaidMinor?: number;
    currency?:       string;
    receiptRef?:     string;
  };

  await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_duties_paid",
    description: [
      "Import duties paid",
      p.receiptRef && `receipt: ${p.receiptRef}`,
      p.currency   && `currency: ${p.currency}`,
    ].filter(Boolean).join(" — "),
  });

  const now = new Date().toISOString();

  // Record confirmed paid amounts and advance customs status to 'cleared'.
  // The DB trigger on customs_status → 'cleared' will auto-enqueue customs.cleared.
  await supabase
    .from("b2b_shipments")
    .update({
      customs_duty_paid_minor:  p.dutyPaidMinor  ?? null,
      customs_vat_paid_minor:   p.vatPaidMinor   ?? null,
      customs_other_paid_minor: p.otherPaidMinor ?? null,
      customs_paid_currency:    p.currency       ?? null,
      customs_status:           "cleared",
      customs_cleared_at:       now,
      updated_at:               now,
    })
    .eq("id", shipment_id);

  return {
    success: true,
    result: { receiptRef: p.receiptRef, currency: p.currency },
  };
};
