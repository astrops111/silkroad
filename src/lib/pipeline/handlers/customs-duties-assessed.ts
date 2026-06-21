import type { EventHandler } from "../types";

const CURRENCY_RE = /^[A-Z]{3}$/;

/**
 * customs.duties_assessed
 * Customs authority has assessed import duties.
 * Payload: dutyMinor (BIGINT), vatMinor (BIGINT), otherMinor (BIGINT), currency (e.g. "KES").
 * Handler records the assessment in the tracking timeline.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { dutyMinor?: number; vatMinor?: number; otherMinor?: number; currency?: string };

  const dutyMinor  = Number(p.dutyMinor  ?? 0);
  const vatMinor   = Number(p.vatMinor   ?? 0);
  const otherMinor = Number(p.otherMinor ?? 0);

  if (!Number.isFinite(dutyMinor)  || dutyMinor  < 0) return { success: false, error: "Invalid dutyMinor" };
  if (!Number.isFinite(vatMinor)   || vatMinor   < 0) return { success: false, error: "Invalid vatMinor" };
  if (!Number.isFinite(otherMinor) || otherMinor < 0) return { success: false, error: "Invalid otherMinor" };

  const currency = p.currency ?? "USD";
  if (!CURRENCY_RE.test(currency)) return { success: false, error: `Invalid currency: ${currency}` };

  const total = dutyMinor + vatMinor + otherMinor;

  const { error: trackErr } = await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_duties_assessed",
    description: `Import duties assessed — duty: ${dutyMinor}, VAT: ${vatMinor}, other: ${otherMinor} (total ${total} ${currency} minor units). Awaiting payment.`,
  });
  if (trackErr) console.error("[pipeline:customs.duties_assessed] tracking insert failed:", trackErr.message);

  // Persist ASSESSED amounts — separate columns from the actual paid amounts (added in 00079)
  await supabase
    .from("b2b_shipments")
    .update({
      customs_duty_assessed_minor:  dutyMinor  || null,
      customs_vat_assessed_minor:   vatMinor   || null,
      customs_other_assessed_minor: otherMinor || null,
      customs_assessed_currency:    currency,
      updated_at:                   new Date().toISOString(),
    })
    .eq("id", shipment_id);

  return {
    success: true,
    result: { totalMinor: total, currency },
  };
};
