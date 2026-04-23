"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const SHIPMENTS_PATH = "/admin/logistics/shipments";
const WRITE_ROLES = ["admin_super", "admin_moderator"];

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdminWrite(): Promise<ActionResult> {
  const user = await getCurrentUser();
  const role = user?.company_members?.[0]?.role;
  if (!role || !WRITE_ROLES.includes(role)) return { success: false, error: "Forbidden" };
  return { success: true };
}

export interface OceanTrackingInput {
  shipmentId: string;
  containerNumber?: string;
  sealNumber?: string;
  billOfLading?: string;
  bookingNumber?: string;
  carrierScac?: string;
  vesselName?: string;
  voyageNo?: string;
  trackingProvider?: string | null;     // null disables polling
  trackingExternalRef?: string | null;
}

export async function saveOceanTracking(input: OceanTrackingInput): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const update: TablesUpdate<"b2b_shipments"> = {
    container_number: input.containerNumber || null,
    seal_number: input.sealNumber || null,
    bill_of_lading: input.billOfLading || null,
    booking_number: input.bookingNumber || null,
    carrier_scac: input.carrierScac ? input.carrierScac.toUpperCase().slice(0, 4) : null,
    vessel_name: input.vesselName || null,
    voyage_no: input.voyageNo || null,
    tracking_provider: input.trackingProvider ?? null,
    tracking_external_ref: input.trackingExternalRef ?? null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("b2b_shipments").update(update).eq("id", input.shipmentId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`${SHIPMENTS_PATH}/${input.shipmentId}`);
  return { success: true };
}
