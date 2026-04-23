"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { DocumentType } from "@/lib/queries/document-requirements";

const REFERENCE_PATH = "/admin/logistics/reference";
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

function toIso2(s: string | undefined | null): string | null {
  if (!s) return null;
  const v = s.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

export interface DocumentRequirementInput {
  id?: string;
  destinationCountry: string;
  documentType: DocumentType;
  hsPrefix?: string;
  shippingMethod?: string;
  containerType?: string;
  isRequired?: boolean;
  notes?: string;
  externalUrl?: string;
  isActive?: boolean;
}

export async function upsertDocumentRequirement(
  input: DocumentRequirementInput,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;

  const dest = toIso2(input.destinationCountry);
  if (!dest) return { success: false, error: "Destination must be 2-letter ISO" };

  const supabase = await createClient();
  const row = {
    destination_country: dest,
    document_type: input.documentType,
    hs_prefix: input.hsPrefix?.trim() || null,
    shipping_method: input.shippingMethod?.trim() || null,
    container_type: input.containerType?.trim() || null,
    is_required: input.isRequired ?? true,
    notes: input.notes?.trim() || null,
    external_url: input.externalUrl?.trim() || null,
    is_active: input.isActive ?? true,
  };

  const op = input.id
    ? supabase.from("document_requirements").update(row).eq("id", input.id).select("id").single()
    : supabase.from("document_requirements").insert(row).select("id").single();

  const { data, error } = await op;
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true, data: { id: data.id } };
}

export async function setDocumentRequirementActive(id: string, isActive: boolean): Promise<ActionResult> {
  const gate = await requireAdminWrite();
  if (!gate.success) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("document_requirements").update({ is_active: isActive }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(REFERENCE_PATH);
  return { success: true };
}
