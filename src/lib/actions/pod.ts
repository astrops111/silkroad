"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { addTrackingEvent } from "@/lib/actions/tracking";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const SHIPMENTS_PATH = "/admin/logistics/shipments";
const WRITE_ROLES = ["admin_super", "admin_moderator"];
const POD_BUCKET = "shipment-pod";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) {
    return { success: false, error: "Forbidden — admin role required" };
  }
  return { success: true, data: { userId: user!.id } };
}

export interface PodCaptureInput {
  shipmentId: string;
  recipientName: string;
  notes?: string;
  // Signature is captured client-side from a canvas as a data URL.
  // Photo is provided either as a data URL (camera capture) or a
  // pre-uploaded URL (e.g. existing storage object). Both optional.
  signatureDataUrl?: string;
  photoDataUrl?: string;
  photoExternalUrl?: string;
  // If true, also flips shipment status to 'delivered' and stamps
  // delivered_at + writes a "pod_captured" tracking event.
  markDelivered?: boolean;
}

// Decode a data URL like "data:image/png;base64,iVBOR..." into raw
// bytes + mime type. Returns null for invalid input.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const bytes = Buffer.from(match[2], "base64");
    return { bytes: new Uint8Array(bytes), contentType: match[1] };
  } catch {
    return null;
  }
}

const MAX_SIGNATURE_BYTES = 500 * 1024;       // 500KB — signatures should be tiny PNGs
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;      // 5MB — single phone photo

export async function capturePod(input: PodCaptureInput): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  if (!input.recipientName || input.recipientName.trim().length < 2) {
    return { success: false, error: "Recipient name is required" };
  }

  const supabase = await createClient();
  let signatureUrl: string | null = null;
  let photoUrl: string | null = input.photoExternalUrl ?? null;

  // Upload signature if provided.
  if (input.signatureDataUrl) {
    const decoded = decodeDataUrl(input.signatureDataUrl);
    if (!decoded) return { success: false, error: "Invalid signature data" };
    if (decoded.bytes.byteLength > MAX_SIGNATURE_BYTES) {
      return { success: false, error: "Signature exceeds 500KB" };
    }
    const ext = decoded.contentType === "image/png" ? "png" : "jpg";
    const path = `${input.shipmentId}/signature-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(POD_BUCKET)
      .upload(path, decoded.bytes, { contentType: decoded.contentType, upsert: true });
    if (error) return { success: false, error: `Signature upload failed: ${error.message}` };
    const { data } = await supabase.storage.from(POD_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
    signatureUrl = data?.signedUrl ?? null;
  }

  // Upload photo if a data URL was supplied (data URL takes precedence over external URL).
  if (input.photoDataUrl) {
    const decoded = decodeDataUrl(input.photoDataUrl);
    if (!decoded) return { success: false, error: "Invalid photo data" };
    if (decoded.bytes.byteLength > MAX_PHOTO_BYTES) {
      return { success: false, error: "Photo exceeds 5MB" };
    }
    const ext = decoded.contentType.split("/")[1] ?? "jpg";
    const path = `${input.shipmentId}/photo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(POD_BUCKET)
      .upload(path, decoded.bytes, { contentType: decoded.contentType, upsert: true });
    if (error) return { success: false, error: `Photo upload failed: ${error.message}` };
    const { data } = await supabase.storage.from(POD_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
    photoUrl = data?.signedUrl ?? null;
  }

  const update: TablesUpdate<"b2b_shipments"> = {
    pod_recipient_name: input.recipientName.trim(),
    pod_notes: input.notes?.trim() || null,
    ...(signatureUrl && { pod_signature_url: signatureUrl }),
    ...(photoUrl && { pod_photo_url: photoUrl }),
  };

  const { error } = await supabase.from("b2b_shipments").update(update).eq("id", input.shipmentId);
  if (error) return { success: false, error: error.message };

  // Auto-advance to delivered when requested. Goes through addTrackingEvent
  // so the timeline picks up a "pod_captured" entry alongside the status
  // transition + delivered_at stamp.
  if (input.markDelivered) {
    await addTrackingEvent({
      shipmentId: input.shipmentId,
      eventType: "pod_captured",
      description: `POD captured — recipient ${input.recipientName.trim()}`,
      newStatus: "delivered",
    });
  }

  revalidatePath(`${SHIPMENTS_PATH}/${input.shipmentId}`);
  return { success: true };
}
