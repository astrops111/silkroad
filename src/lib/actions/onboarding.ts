"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { MarketRegion, PlatformRole } from "@/lib/supabase/database.types";

export type OnboardingResult =
  | { success: true; redirectPath: string }
  | { success: false; error: string };

export interface OnboardingInput {
  companyName: string;
  type: "buyer_org" | "supplier";
  countryCode: string;
  marketRegion: string;
  industry?: string;
  city?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).slice(2, 8));
}

// Onboarding writes companies/company_members/supplier_profiles rows for a
// brand-new user. RLS only allows admins to insert into those tables, so this
// must run through the service client — mirrors signUp() in ./auth.ts. The
// user id is derived server-side from the authenticated session, never taken
// from the client, so this can't be used to write memberships for someone else.
async function createCompanyForCurrentUser(
  input: OnboardingInput,
  isPrimary: boolean
): Promise<OnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const serviceClient = createServiceClient();

  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { success: false, error: "Profile not found" };

  const { data: company, error: companyError } = await serviceClient
    .from("companies")
    .insert({
      name: input.companyName,
      slug: slugify(input.companyName),
      type: input.type,
      country_code: input.countryCode,
      market_region: input.marketRegion as MarketRegion,
      industry: input.industry || null,
      city: input.city || null,
    })
    .select()
    .single();
  if (companyError || !company) {
    return { success: false, error: companyError?.message ?? "Failed to create company" };
  }

  const role: PlatformRole = input.type === "supplier" ? "supplier_owner" : "buyer";
  const { error: memberError } = await serviceClient.from("company_members").insert({
    company_id: company.id,
    user_id: profile.id,
    role,
    is_primary: isPrimary,
  });
  if (memberError) {
    return { success: false, error: memberError.message };
  }

  if (input.type === "supplier") {
    await serviceClient.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: input.countryCode,
    });
  }

  return { success: true, redirectPath: "" };
}

/** First-time onboarding: the new company becomes the user's primary membership. */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const result = await createCompanyForCurrentUser(input, true);
  if (!result.success) return result;
  return { success: true, redirectPath: input.type === "supplier" ? "/supplier" : "/dashboard" };
}

/** Adding a second role (e.g. an existing buyer also registering as a supplier). */
export async function addCompanyRole(input: OnboardingInput): Promise<OnboardingResult> {
  const result = await createCompanyForCurrentUser(input, false);
  if (!result.success) return result;
  return {
    success: true,
    redirectPath: input.type === "supplier" ? "/supplier/dashboard" : "/dashboard",
  };
}
