"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply, findSupplierMembership } from "@/lib/company-access";
import {
  resourceListingSchema,
  type ResourceListingInput,
} from "@/lib/validators/resource-listing";
import type { TradeTerm } from "@/lib/supabase/database.types";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const SUPPLIER_WRITE_ROLES = [
  "supplier_owner",
  "supplier_catalog",
  "supplier_sales",
];

async function getVerifiedSupplierCompanyId(): Promise<
  { ok: true; companyId: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  const membership = findSupplierMembership(user?.company_members);
  if (!membership) return { ok: false, error: "Not signed in" };
  if (!canSupply(membership.companies?.type)) {
    return { ok: false, error: "Only supplier accounts can manage resource listings" };
  }
  if (!SUPPLIER_WRITE_ROLES.includes(membership.role)) {
    return { ok: false, error: "Your role cannot manage resource listings" };
  }
  // Resource listings involve export compliance (Kimberley, CITES, GACC, etc.),
  // so — unlike manufactured-goods products — creation requires at least a
  // submitted KYC application, not just an existing company record.
  if (membership.companies?.verification_status === "unverified") {
    return {
      ok: false,
      error:
        "Submit your supplier verification before listing resources. Go to Settings → Verification.",
    };
  }
  return { ok: true, companyId: membership.company_id };
}

async function assertOwnsListing(listingId: string) {
  const gate = await getVerifiedSupplierCompanyId();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { data } = await supabase
    .from("commodities")
    .select("tenant_id, status")
    .eq("id", listingId)
    .single();
  if (!data) return { ok: false as const, error: "Listing not found" };
  if (data.tenant_id !== gate.companyId) {
    return { ok: false as const, error: "Not your listing" };
  }
  return { ok: true as const, companyId: gate.companyId, status: data.status };
}

const ADMIN_ROLES = ["admin_super", "admin_moderator"];

/** Mirrors the admin-write gate in src/lib/actions/admin.ts. */
async function requireAdminWrite(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  const role = user?.company_members?.find((m) => ADMIN_ROLES.includes(m.role))?.role;
  if (!role) return { ok: false, error: "Forbidden — admin role required" };
  return { ok: true };
}

// kg-equivalent of one unit, for mass-based units of measure. Used only to
// populate the legacy NOT NULL price_usd_per_kg column with a correct
// value instead of silently mislabeling "price per MT" as "price per kg".
// Volume/count units (m3, troy_oz, ...) have no kg equivalent — for those
// the raw per-unit price is kept as the closest available approximation.
const KG_PER_UNIT: Record<string, number> = {
  kg: 1,
  kgs: 1,
  g: 0.001,
  gs: 0.001,
  gram: 0.001,
  grams: 0.001,
  mt: 1000,
  mts: 1000,
  t: 1000,
  ts: 1000,
  tonne: 1000,
  tonnes: 1000,
  ton: 1000,
  tons: 1000,
  "metric ton": 1000,
  "metric tons": 1000,
  "metric tonne": 1000,
  "metric tonnes": 1000,
  lb: 0.453592,
  lbs: 0.453592,
  pound: 0.453592,
  pounds: 0.453592,
};

// unitOfMeasure is free text (see new-resource-listing-form.tsx), so this
// normalizes common punctuation/case variants ("MT.", "Metric Tons") before
// the lookup — an unmatched unit falls back to the raw per-unit price
// rather than guessing.
function toPricePerKg(pricePerUnitUsd: number, unitOfMeasure: string): number {
  const normalized = unitOfMeasure.trim().toLowerCase().replace(/\.+$/, "").replace(/\s+/g, " ");
  const kgPerUnit = KG_PER_UNIT[normalized];
  if (!kgPerUnit) return pricePerUnitUsd;
  return pricePerUnitUsd / kgPerUnit;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).slice(2, 8));
}

export async function createResourceListing(
  input: ResourceListingInput
): Promise<ActionResult<{ id: string }>> {
  const gate = await getVerifiedSupplierCompanyId();
  if (!gate.ok) return { success: false, error: gate.error };

  const parsed = resourceListingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const { data: category, error: categoryError } = await supabase
    .from("resource_categories")
    .select("group_code, slug")
    .eq("id", parsed.data.resourceCategoryId)
    .eq("is_active", true)
    .single();
  if (categoryError || !category) {
    return { success: false, error: "Invalid category" };
  }

  const { data, error } = await supabase
    .from("commodities")
    .insert({
      tenant_id: gate.companyId,
      created_by: user.id,
      name_en: parsed.data.nameEn,
      name_zh: parsed.data.nameZh ?? null,
      name_fr: parsed.data.nameFr ?? null,
      slug: slugify(parsed.data.nameEn),
      category: category.group_code,
      subcategory: category.slug,
      resource_category_id: parsed.data.resourceCategoryId,
      origin_country: parsed.data.originCountry.toUpperCase(),
      origin_region: parsed.data.originRegion ?? null,
      grade: parsed.data.grade ?? null,
      variety: parsed.data.variety ?? null,
      unit_of_measure: parsed.data.unitOfMeasure,
      incoterm: (parsed.data.incoterm as TradeTerm) ?? null,
      port_of_loading: parsed.data.portOfLoading ?? null,
      port_of_discharge: parsed.data.portOfDischarge ?? null,
      available_quantity: parsed.data.availableQuantity,
      min_order_quantity: parsed.data.minOrderQuantity ?? null,
      price_per_unit_usd: parsed.data.pricePerUnitUsd,
      // Legacy NOT NULL column that predates price_per_unit_usd — converted
      // from the per-unit price via KG_PER_UNIT so it isn't mislabeled
      // (e.g. "price per MT" stored as-is under a "per kg" column name).
      price_usd_per_kg: toPricePerKg(parsed.data.pricePerUnitUsd, parsed.data.unitOfMeasure),
      currency: parsed.data.currency.toUpperCase(),
      lead_time_days: parsed.data.leadTimeDays ?? null,
      images: parsed.data.images ?? [],
      kimberley_cert_ref: parsed.data.kimberleyCertRef ?? null,
      oecd_3tg_due_diligence_ref: parsed.data.oecd3tgDueDiligenceRef ?? null,
      cites_permit_ref: parsed.data.citesPermitRef ?? null,
      gacc_registration_ref: parsed.data.gaccRegistrationRef ?? null,
      mine_license_ref: parsed.data.mineLicenseRef ?? null,
      export_permit_ref: parsed.data.exportPermitRef ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/supplier/resources");
  return { success: true, data: { id: data.id } };
}

/**
 * Supplier-only, self-service status toggle. Deliberately does NOT accept an
 * arbitrary status from the caller — only two closed transitions exist
 * (approved -> suspended, suspended -> pending for re-review), so a supplier
 * can never set their own listing to "approved". Use moderateResourceListing
 * for that.
 */
export async function toggleResourceListingActive(listingId: string): Promise<ActionResult> {
  const own = await assertOwnsListing(listingId);
  if (!own.ok) return { success: false, error: own.error };
  if (own.status !== "approved" && own.status !== "suspended") {
    return { success: false, error: "Listing cannot be toggled from its current status" };
  }
  const nextStatus = own.status === "approved" ? "suspended" : "pending";

  const supabase = await createClient();
  // Guard on the status we actually read: if an admin's moderateResourceListing
  // changed it between our read and this write (e.g. rejected it), this
  // update should no-op instead of silently clobbering that decision.
  const { data: updated, error } = await supabase
    .from("commodities")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("status", own.status)
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }
  if (!updated || updated.length === 0) {
    return {
      success: false,
      error: "Listing status changed since this page loaded — refresh and try again.",
    };
  }

  revalidatePath("/supplier/resources");
  return { success: true };
}

/** Admin-only: approve or reject a resource listing after compliance review. */
export async function moderateResourceListing(
  listingId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  const admin = await requireAdminWrite();
  if (!admin.ok) return { success: false, error: admin.error };

  // Service client: RLS scopes commodities writes to the owning tenant, and
  // the moderator is not the owner. Access is gated by requireAdminWrite above.
  const supabase = createServiceClient();
  const { error, data } = await supabase
    .from("commodities")
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .select("id");
  if (!error && (data ?? []).length === 0) {
    return { success: false, error: "Listing not found" };
  }

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/resources");
  revalidatePath("/resources/listings");
  return { success: true };
}

export async function deleteResourceListing(listingId: string): Promise<ActionResult> {
  const own = await assertOwnsListing(listingId);
  if (!own.ok) return { success: false, error: own.error };
  const supabase = await createClient();
  const { error } = await supabase.from("commodities").delete().eq("id", listingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/supplier/resources");
  return { success: true };
}
