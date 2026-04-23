// ============================================================
// Shared event-ingestion helper used by both the poll runner and
// the webhook endpoint.
//
// Resolves a TrackingEventIngestion's `lookup` (by tracking_number,
// shipment_id, or external_ref) into a concrete shipment id, dedups
// against (source_adapter_id, external_event_id), inserts the
// event, and forward-only-advances the shipment status.
// ============================================================

import type { createServiceClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import type { TrackingEventIngestion } from "@/lib/logistics/carriers/types";

export type IngestOutcome = "inserted" | "skipped_dedup" | "skipped_no_match" | "error";

const TERMINAL_STATUSES = ["delivered", "lost", "damaged", "returned"];

export async function resolveShipmentId(
  supabase: ReturnType<typeof createServiceClient>,
  lookup: TrackingEventIngestion["lookup"],
): Promise<string | null> {
  if (lookup.by === "shipment_id") return lookup.value;

  if (lookup.by === "tracking_number") {
    const { data } = await supabase
      .from("b2b_shipments")
      .select("id")
      .eq("tracking_number", lookup.value)
      .maybeSingle();
    return data?.id ?? null;
  }

  // external_ref: matches what we stored as tracking_external_ref when
  // the shipment was activated for tracking via OceanTrackingPanel.
  // Container # / BL # / booking # are the typical values.
  const { data } = await supabase
    .from("b2b_shipments")
    .select("id")
    .eq("tracking_provider", lookup.adapterId)
    .eq("tracking_external_ref", lookup.value)
    .maybeSingle();
  return data?.id ?? null;
}

export async function ingestTrackingEvent(
  supabase: ReturnType<typeof createServiceClient>,
  adapterId: string,
  event: TrackingEventIngestion,
): Promise<IngestOutcome> {
  const shipmentId = await resolveShipmentId(supabase, event.lookup);
  if (!shipmentId) return "skipped_no_match";

  if (event.externalEventId) {
    const { data: existing } = await supabase
      .from("shipment_tracking_events")
      .select("id")
      .eq("source_adapter_id", adapterId)
      .eq("external_event_id", event.externalEventId)
      .maybeSingle();
    if (existing) return "skipped_dedup";
  }

  const insert: TablesInsert<"shipment_tracking_events"> = {
    shipment_id: shipmentId,
    event_type: event.eventType,
    description: event.description ?? null,
    location: (event.location ?? null) as Json | null,
    source_adapter_id: adapterId,
    external_event_id: event.externalEventId ?? null,
    created_at: event.occurredAt ?? undefined,
  };

  const { error } = await supabase.from("shipment_tracking_events").insert(insert);
  if (error) {
    console.error("ingestTrackingEvent: insert failed", error);
    return "error";
  }

  if (event.newStatus) {
    const update: Record<string, unknown> = { status: event.newStatus };
    if (event.newStatus === "dispatched") update.dispatched_at = new Date().toISOString();
    if (event.newStatus === "delivered") update.delivered_at = new Date().toISOString();
    if (event.location) update.current_location = event.location;
    const { error: upErr } = await supabase
      .from("b2b_shipments")
      .update(update)
      .eq("id", shipmentId)
      .not("status", "in", `(${TERMINAL_STATUSES.map((s) => `"${s}"`).join(",")})`);
    if (upErr) console.error("ingestTrackingEvent: status advance failed", upErr);
  }

  return "inserted";
}
