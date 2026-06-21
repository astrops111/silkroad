import type { EventHandler } from "../types";
import { logActivity } from "@/lib/logging";

/**
 * customs.hold_resolved
 * Fires when a customs hold is resolved. Ops resolves via admin UI
 * (resolveCustomsHold action), which flips customs_status back to 'submitted'.
 * That DB trigger re-enqueues customs.entry_filed for continuity.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { shipment_id, payload } = event;
  if (!shipment_id) return { success: false, error: "Missing shipment_id" };

  const p = payload as { resolutionNote?: string };

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("shipment_number, customs_status")
    .eq("id", shipment_id)
    .maybeSingle();

  if (!shipment) return { success: false, error: `Shipment ${shipment_id} not found` };

  const { error: trackErr } = await supabase.from("shipment_tracking_events").insert({
    shipment_id,
    event_type:  "customs_hold_resolved",
    description: [
      `Customs hold resolved — ${shipment.shipment_number ?? shipment_id}`,
      p.resolutionNote && `note: ${p.resolutionNote}`,
      `Customs status: ${shipment.customs_status ?? "unknown"}`,
    ].filter(Boolean).join(" — "),
  });
  if (trackErr) console.error("[pipeline:customs.hold_resolved] tracking insert failed:", trackErr.message);

  await logActivity({
    activityType: "customs_hold_resolved",
    description:  `Customs hold resolved for ${shipment?.shipment_number ?? shipment_id}`,
    targetType:   "shipment",
    targetId:     shipment_id,
    targetLabel:  shipment?.shipment_number ?? shipment_id,
    metadata:     { shipmentId: shipment_id, resolutionNote: p.resolutionNote },
  }).catch(() => {});

  return {
    success: true,
    result: { shipmentId: shipment_id, currentCustomsStatus: shipment?.customs_status },
  };
};
