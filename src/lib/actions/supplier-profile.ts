"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type {
  MarketRegion,
  TradeTerm,
} from "@/lib/supabase/database.types";
import { canSupply } from "@/lib/company-access";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

const OWNER_ONLY: string[] = ["supplier_owner"];
const MANAGE_ROLES: string[] = [
  "supplier_owner",
  "supplier_catalog",
  "supplier_sales",
];

async function requireSupplier(requireOwner = false) {
  const user = await getCurrentUser();
  const membership = user?.company_members?.[0];
  if (!membership) return { ok: false as const, error: "Not signed in" };
  if (!canSupply(membership.companies?.type)) {
    return { ok: false as const, error: "Supplier accounts only" };
  }
  const allowed = requireOwner ? OWNER_ONLY : MANAGE_ROLES;
  if (!allowed.includes(membership.role)) {
    return { ok: false as const, error: "Your role cannot edit this" };
  }
  return {
    ok: true as const,
    companyId: membership.company_id,
    userId: membership.user_id,
    role: membership.role,
  };
}

export interface CompanyProfileInput {
  name?: string;
  nameLocal?: string;
  description?: string;
  website?: string;
  industry?: string;
  countryCode?: string;
  city?: string;
  stateProvince?: string;
  address?: string;
  logoUrl?: string;
  establishedYear?: number;
  employeeCountRange?: string;
  marketRegion?: MarketRegion;
  taxId?: string;
  taxIdType?: string;
}

export async function updateCompanyProfile(
  input: CompanyProfileInput
): Promise<ActionResult> {
  const gate = await requireSupplier();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) {
    if (input.name.trim().length < 2) {
      return { success: false, error: "Company name too short" };
    }
    patch.name = input.name.trim();
  }
  if (input.nameLocal !== undefined) patch.name_local = input.nameLocal || null;
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.website !== undefined) patch.website = input.website || null;
  if (input.industry !== undefined) patch.industry = input.industry || null;
  if (input.countryCode !== undefined)
    patch.country_code = input.countryCode.toUpperCase();
  if (input.city !== undefined) patch.city = input.city || null;
  if (input.stateProvince !== undefined) patch.state_province = input.stateProvince || null;
  if (input.address !== undefined) patch.address = input.address || null;
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl || null;
  if (input.establishedYear !== undefined)
    patch.established_year = input.establishedYear || null;
  if (input.employeeCountRange !== undefined)
    patch.employee_count_range = input.employeeCountRange || null;
  if (input.marketRegion !== undefined) patch.market_region = input.marketRegion;
  if (input.taxId !== undefined) patch.tax_id = input.taxId || null;
  if (input.taxIdType !== undefined) patch.tax_id_type = input.taxIdType || null;

  const { error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", gate.companyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/supplier/settings");
  return { success: true };
}

export interface SupplierProfileInput {
  factoryAddress?: string;
  factoryCity?: string;
  factoryCountry?: string;
  businessLicenseUrl?: string;
  moqDefault?: number;
  leadTimeDaysDefault?: number;
  tradeTermsDefault?: TradeTerm;
  certifications?: string[];
  bankCode?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  mobileMoneyNumber?: string;
  mobileMoneyProvider?: string;
}

export async function updateSupplierProfile(
  input: SupplierProfileInput
): Promise<ActionResult> {
  const gate = await requireSupplier();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("supplier_profiles")
    .select("id")
    .eq("company_id", gate.companyId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.factoryAddress !== undefined)
    patch.factory_address = input.factoryAddress || null;
  if (input.factoryCity !== undefined)
    patch.factory_city = input.factoryCity || null;
  if (input.factoryCountry !== undefined)
    patch.factory_country = input.factoryCountry.toUpperCase();
  if (input.businessLicenseUrl !== undefined)
    patch.business_license_url = input.businessLicenseUrl || null;
  if (input.moqDefault !== undefined) patch.moq_default = input.moqDefault || null;
  if (input.leadTimeDaysDefault !== undefined)
    patch.lead_time_days_default = input.leadTimeDaysDefault || null;
  if (input.tradeTermsDefault !== undefined)
    patch.trade_terms_default = input.tradeTermsDefault;
  if (input.certifications !== undefined)
    patch.certifications = input.certifications;
  if (input.bankCode !== undefined) patch.bank_code = input.bankCode || null;
  if (input.bankAccountNumber !== undefined)
    patch.bank_account_number = input.bankAccountNumber || null;
  if (input.bankAccountName !== undefined)
    patch.bank_account_name = input.bankAccountName || null;
  if (input.bankBranch !== undefined)
    patch.bank_branch = input.bankBranch || null;
  if (input.mobileMoneyNumber !== undefined)
    patch.mobile_money_number = input.mobileMoneyNumber || null;
  if (input.mobileMoneyProvider !== undefined)
    patch.mobile_money_provider = input.mobileMoneyProvider || null;

  if (existing) {
    const { error } = await supabase
      .from("supplier_profiles")
      .update(patch)
      .eq("company_id", gate.companyId);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("supplier_profiles").insert({
      company_id: gate.companyId,
      ...patch,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/supplier/settings");
  return { success: true };
}
