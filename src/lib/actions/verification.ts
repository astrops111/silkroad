"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function submitVerification(
  companyId: string,
  documents: {
    businessLicenseUrl?: string;
    taxId?: string;
    taxIdType?: string;
    factoryPhotos?: string[];
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  // Update company with tax info
  if (documents.taxId) {
    await supabase
      .from("companies")
      .update({
        tax_id: documents.taxId,
        tax_id_type: documents.taxIdType ?? null,
        verification_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);
  } else {
    await supabase
      .from("companies")
      .update({
        verification_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);
  }

  // Update supplier profile with documents
  if (documents.businessLicenseUrl) {
    await supabase
      .from("supplier_profiles")
      .update({
        business_license_url: documents.businessLicenseUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);
  }

  return { success: true };
}

export async function getVerificationStatus(companyId: string) {
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("verification_status, verified_at, tax_id, tax_id_type, tax_id_verified")
    .eq("id", companyId)
    .single();

  const { data: profile } = await supabase
    .from("supplier_profiles")
    .select("business_license_url, certifications")
    .eq("company_id", companyId)
    .single();

  return {
    status: company?.verification_status ?? "unverified",
    verifiedAt: company?.verified_at,
    taxId: company?.tax_id,
    taxIdType: company?.tax_id_type,
    taxIdVerified: company?.tax_id_verified,
    businessLicenseUrl: profile?.business_license_url,
    certifications: profile?.certifications ?? [],
  };
}
