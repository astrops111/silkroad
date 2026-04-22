"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import type { MarketRegion, PlatformRole } from "@/lib/supabase/database.types";

const ADMIN_ROLES = ["admin_super", "admin_moderator", "admin_support"] as const;

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: "buyer" | "supplier";
  companyName: string;
  countryCode: string;
  marketRegion: string;
};

export type CreateUserResult = {
  success: boolean;
  error?: string;
  authUserId?: string;
  companyId?: string;
};

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

export async function adminCreateUser(
  input: CreateUserInput
): Promise<CreateUserResult> {
  // Gatekeep — only admins can hit this action.
  const caller = await getCurrentUser();
  if (!caller) return { success: false, error: "Not authenticated" };
  const isAdmin = caller.company_members.some((m) =>
    (ADMIN_ROLES as readonly string[]).includes(m.role)
  );
  if (!isAdmin) return { success: false, error: "Forbidden — admin only" };

  // Basic validation.
  if (!input.email || !input.password || !input.fullName || !input.companyName) {
    return { success: false, error: "Missing required fields" };
  }
  if (input.password.length < 8) {
    return { success: false, error: "Password must be ≥ 8 characters" };
  }
  if (input.role !== "buyer" && input.role !== "supplier") {
    return { success: false, error: "Invalid role" };
  }

  const admin = createServiceClient();

  // 1. auth.users
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authErr || !created?.user) {
    return {
      success: false,
      error: authErr?.message ?? "Failed to create auth user",
    };
  }
  const authUserId = created.user.id;

  // 2. user_profiles
  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .insert({
      auth_id: authUserId,
      email: input.email,
      full_name: input.fullName,
      country_code: input.countryCode,
    })
    .select("id")
    .single();
  if (profileErr || !profile) {
    return { success: false, error: profileErr?.message ?? "Profile failed" };
  }

  // 3. companies
  const companyType = input.role === "supplier" ? "supplier" : "buyer_org";
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({
      name: input.companyName,
      slug: slugify(input.companyName),
      type: companyType,
      country_code: input.countryCode,
      market_region: input.marketRegion as MarketRegion,
    })
    .select("id")
    .single();
  if (companyErr || !company) {
    return { success: false, error: companyErr?.message ?? "Company failed" };
  }

  // 4. company_members
  const platformRole: PlatformRole =
    input.role === "supplier" ? "supplier_owner" : "buyer";
  const { error: memberErr } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: profile.id,
    role: platformRole,
    is_primary: true,
  });
  if (memberErr) {
    return { success: false, error: memberErr.message };
  }

  // 5. supplier_profiles (suppliers only)
  if (input.role === "supplier") {
    const { error: spErr } = await admin.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: input.countryCode,
    });
    if (spErr) {
      return { success: false, error: spErr.message };
    }
  }

  return {
    success: true,
    authUserId,
    companyId: company.id,
  };
}
