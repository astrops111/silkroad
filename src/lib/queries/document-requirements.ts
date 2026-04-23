"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type DocumentType = Enums<"document_type">;
export type DocumentRequirementRow = Tables<"document_requirements">;

export interface ResolvedDocumentRequirement {
  id: string;
  documentType: DocumentType;
  isRequired: boolean;
  notes: string | null;
  externalUrl: string | null;
  scope: string;   // human label: "country-wide" | "HS 8517" | "only for air_freight" etc.
}

export interface DocRequirementFilters {
  destinationCountry?: string;
  includeInactive?: boolean;
}

export async function listDocumentRequirements(
  filters: DocRequirementFilters = {},
): Promise<DocumentRequirementRow[]> {
  const supabase = await createClient();
  let q = supabase.from("document_requirements").select("*");
  if (!filters.includeInactive) q = q.eq("is_active", true);
  if (filters.destinationCountry) q = q.eq("destination_country", filters.destinationCountry);

  const { data, error } = await q
    .order("destination_country")
    .order("document_type")
    .limit(500);
  if (error) {
    console.error("listDocumentRequirements failed", error);
    return [];
  }
  return data ?? [];
}

/**
 * Resolve the documents actually required for one specific shipment context
 * (destination + HS codes + method + container). Rules with NULL scope fields
 * apply unconditionally; NON-NULL fields must match the context.
 */
export async function resolveRequiredDocuments(ctx: {
  destinationCountry: string;
  hsCodes?: string[];
  shippingMethod?: string;
  containerType?: string;
}): Promise<ResolvedDocumentRequirement[]> {
  const all = await listDocumentRequirements({ destinationCountry: ctx.destinationCountry });
  const hsCodes = ctx.hsCodes ?? [];

  return all
    .filter((r) => {
      if (r.hs_prefix) {
        if (!hsCodes.some((hs) => hs.startsWith(r.hs_prefix!))) return false;
      }
      if (r.shipping_method && ctx.shippingMethod && r.shipping_method !== ctx.shippingMethod) return false;
      if (r.container_type && ctx.containerType && r.container_type !== ctx.containerType) return false;
      return true;
    })
    .map((r) => ({
      id: r.id,
      documentType: r.document_type,
      isRequired: r.is_required,
      notes: r.notes,
      externalUrl: r.external_url,
      scope: describeScope(r),
    }));
}

function describeScope(r: DocumentRequirementRow): string {
  const bits: string[] = [];
  if (r.hs_prefix) bits.push(`HS starts with ${r.hs_prefix}`);
  if (r.shipping_method) bits.push(`method=${r.shipping_method}`);
  if (r.container_type) bits.push(`container=${r.container_type}`);
  return bits.length === 0 ? "country-wide" : bits.join(" · ");
}
