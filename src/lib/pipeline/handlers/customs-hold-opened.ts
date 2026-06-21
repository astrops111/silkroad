import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";

/**
 * customs.hold_opened
 * Fires when customs_status transitions to 'on_hold' (DB trigger).
 * The hold record is already created by ops in the admin UI.
 * Handler records the milestone and alerts via activity log.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { brokerRef?: string; holdReason?: string };

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("shipment_number")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  const { error: trackErr } = await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_hold_opened",
    description: [
      `Customs hold opened — ${shipment.shipment_number ?? shipment_id}`,
      p.holdReason && `reason: ${p.holdReason}`,
      p.brokerRef  && `broker ref: ${p.brokerRef}`,
      "Ops team has been alerted.",
    ].filter(Boolean).join(" — "),
  });
  if (trackErr) console.error("[pipeline:customs.hold_opened] tracking insert failed:", trackErr.message);

  await logActivity({
    activityType: "customs_hold_opened",
    description:  `Customs hold opened — ${p.holdReason ?? "unknown reason"}. Ops intervention required.`,
    targetType:   "shipment",
    targetId:     shipment_id,
    targetLabel:  shipment?.shipment_number ?? shipment_id,
    metadata:     { shipmentId: shipment_id, holdReason: p.holdReason, brokerRef: p.brokerRef },
  }).catch(() => {});

  return {
    success: true,
    result: { shipmentId: shipment_id, holdReason: p.holdReason },
  };
};
