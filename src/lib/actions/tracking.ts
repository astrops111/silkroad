"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { Enums, Json, TablesInsert } from "@/lib/supabase/database.types";

const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ShipmentStatus = Enums<"shipment_status">;

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult> {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) return { success: false, error: "Forbidden" };
  return { success: true };
}

export interface TrackingEventInput {
  shipmentId: string;
  eventType: string;             // free-form: "arrived_at_port" / "customs_hold_released" / etc.
  description?: string;
  location?: { city?: string; country?: string; port?: string; lat?: number; lng?: number; label?: string };
  photoUrl?: string;
  // If set, also advances the shipment to this status.
  newStatus?: ShipmentStatus;
  // Optional timestamp override (defaults to now). Useful when backfilling.
  occurredAt?: string;
}

export async function addTrackingEvent(input: TrackingEventInput): Promise<ActionResult<{ eventId: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();

  const event: TablesInsert<"shipment_tracking_events"> = {
    shipment_id: input.shipmentId,
    event_type: input.eventType,
    description: input.description ?? null,
    location: (input.location ?? null) as Json | null,
    photo_url: input.photoUrl ?? null,
    created_at: input.occurredAt ?? undefined,
  };

  const { data, error } = await supabase
    .from("shipment_tracking_events")
    .insert(event)
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  // Status transition side effects
  if (input.newStatus) {
    const update: Record<string, unknown> = { status: input.newStatus };
    if (input.newStatus === "picking" || input.newStatus === "packed") {
      // no-op
    } else if (input.newStatus === "dispatched") {
      update.dispatched_at = new Date().toISOString();
    } else if (input.newStatus === "delivered") {
      update.delivered_at = new Date().toISOString();
    }
    if (input.location) {
      update.current_location = input.location;
    }
    const { error: upErr } = await supabase.from("b2b_shipments").update(update).eq("id", input.shipmentId);
    if (upErr) {
      // Event already persisted; surface but don't fail the whole action.
      console.error("addTrackingEvent: status update failed", upErr);
    }
  }

  revalidatePath(`/admin/logistics/shipments/${input.shipmentId}`);
  return { success: true, data: { eventId: data.id } };
}

export async function setShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status === "dispatched") update.dispatched_at = new Date().toISOString();
  if (status === "delivered") update.delivered_at = new Date().toISOString();
  if (status === "picking") update.picked_up_at = new Date().toISOString();

  const { error } = await supabase.from("b2b_shipments").update(update).eq("id", shipmentId);
  if (error) return { success: false, error: error.message };

  // Auto-record an event so the timeline doesn't miss the transition.
  await supabase.from("shipment_tracking_events").insert({
    shipment_id: shipmentId,
    event_type: `status_${status}`,
    description: `Shipment marked ${status.replace(/_/g, " ")}`,
  });

  revalidatePath(`/admin/logistics/shipments/${shipmentId}`);
  return { success: true };
}

export async function listShipmentTrackingEvents(shipmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipment_tracking_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("listShipmentTrackingEvents failed", error);
    return [];
  }
  return data ?? [];
}
