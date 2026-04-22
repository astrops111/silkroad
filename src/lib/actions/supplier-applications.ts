"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface SupplierApplicationInput {
  fullName: string;
  email: string;
  phone?: string;
  roleAtCompany?: string;
  companyName: string;
  companyNameLocal?: string;
  countryCode?: string;
  city?: string;
  website?: string;
  yearsInBusiness?: string;
  employeeRange?: string;
  productCategories?: string[];
  productsDescription: string;
  monthlyCapacity?: string;
  existingMarkets?: string;
  certifications?: string;
  sampleAvailable?: boolean;
  locale?: string;
  sourcePath?: string;
}

const MANAGE_ROLES = ["admin_super", "admin_moderator", "admin_support"];

async function requireAdmin() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.[0];
  if (!membership || !MANAGE_ROLES.includes(membership.role)) {
    return { ok: false as const, error: "Forbidden" };
  }
  return { ok: true as const, userId: membership.user_id, role: membership.role };
}

export async function submitSupplierApplication(
  input: SupplierApplicationInput
): Promise<ActionResult<{ id: string }>> {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const companyName = input.companyName?.trim();
  const productsDescription = input.productsDescription?.trim();

  if (!fullName || fullName.length < 2) {
    return { success: false, error: "Please enter your full name." };
  }
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email." };
  }
  if (!companyName || companyName.length < 2) {
    return { success: false, error: "Please enter your company name." };
  }
  if (!productsDescription || productsDescription.length < 20) {
    return {
      success: false,
      error: "Please describe the products you want to sell (20 characters min).",
    };
  }

  // Capture requester identity if signed in (optional).
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  let requesterUserId: string | null = null;
  if (authData?.user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("auth_id", authData.user.id)
      .maybeSingle();
    requesterUserId = profile?.id ?? null;
  }

  // Use the service client so RLS can't bite anonymous submitters.
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("supplier_applications")
    .insert({
      requester_user_id: requesterUserId,
      full_name: fullName,
      email,
      phone: input.phone?.trim() || null,
      role_at_company: input.roleAtCompany?.trim() || null,
      company_name: companyName,
      company_name_local: input.companyNameLocal?.trim() || null,
      country_code: input.countryCode?.toUpperCase() || null,
      city: input.city?.trim() || null,
      website: input.website?.trim() || null,
      years_in_business: input.yearsInBusiness || null,
      employee_range: input.employeeRange || null,
      product_categories: input.productCategories ?? [],
      products_description: productsDescription,
      monthly_capacity: input.monthlyCapacity?.trim() || null,
      existing_markets: input.existingMarkets?.trim() || null,
      certifications: input.certifications?.trim() || null,
      sample_available: input.sampleAvailable ?? false,
      locale: input.locale || null,
      source_path: input.sourcePath || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/supplier-applications");
  return { success: true, data: { id: data.id } };
}

export async function updateSupplierApplicationStatus(
  id: string,
  status: "pending" | "in_review" | "approved" | "rejected" | "contacted",
  adminNotes?: string
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.userId,
  };
  if (adminNotes !== undefined) patch.admin_notes = adminNotes;

  const { error } = await supabase
    .from("supplier_applications")
    .update(patch)
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/supplier-applications");
  revalidatePath(`/admin/supplier-applications/${id}`);
  return { success: true };
}
