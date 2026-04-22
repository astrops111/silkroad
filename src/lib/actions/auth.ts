"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators/auth";
import type { MarketRegion, PlatformRole } from "@/lib/supabase/database.types";
import { logLoginAttempt } from "@/lib/logging/sessions";
import {
  getLockoutState,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MINUTES,
} from "@/lib/security/lockout";
import { sendWelcomeEmail } from "@/lib/email";

export type ActionResult = {
  success: boolean;
  error?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).slice(2, 8));
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase().trim();

  const lockout = await getLockoutState(email);
  if (lockout.locked) {
    await logLoginAttempt({
      email,
      status: "blocked",
      failureReason: "account_locked",
    });
    const mins = Math.max(1, Math.ceil(lockout.retryAfterSeconds / 60));
    return {
      success: false,
      error: `Too many failed attempts. Account locked. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    await logLoginAttempt({
      email,
      status: "failed",
      failureReason: error.message,
    });

    const totalFailures = lockout.failuresSinceSuccess + 1;
    const remaining = MAX_FAILED_ATTEMPTS - totalFailures;
    if (remaining <= 0) {
      return {
        success: false,
        error: `Invalid credentials. Account locked for ${LOCKOUT_WINDOW_MINUTES} minutes.`,
      };
    }
    return {
      success: false,
      error: `Invalid credentials. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`,
    };
  }

  await logLoginAttempt({
    email,
    status: "success",
  });

  return { success: true };
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    fullName: formData.get("fullName") as string,
    role: formData.get("role") as string,
    companyName: formData.get("companyName") as string,
    countryCode: formData.get("countryCode") as string,
    marketRegion: formData.get("marketRegion") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Registration failed" };
  }

  // 2. Create user profile (via service client to bypass RLS)
  const { data: profile, error: profileError } = await serviceClient
    .from("user_profiles")
    .insert({
      auth_id: authData.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      country_code: parsed.data.countryCode,
    })
    .select()
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Failed to create profile" };
  }

  // 3. Create company
  const companyType = parsed.data.role === "supplier" ? "supplier" : "buyer_org";
  const companySlug = slugify(parsed.data.companyName);

  const { data: company, error: companyError } = await serviceClient
    .from("companies")
    .insert({
      name: parsed.data.companyName,
      slug: companySlug,
      type: companyType,
      country_code: parsed.data.countryCode,
      market_region: parsed.data.marketRegion as MarketRegion,
    })
    .select()
    .single();

  if (companyError || !company) {
    return { success: false, error: "Failed to create company" };
  }

  // 4. Create company membership
  const memberRole: PlatformRole =
    parsed.data.role === "supplier" ? "supplier_owner" : "buyer";

  await serviceClient.from("company_members").insert({
    company_id: company.id,
    user_id: profile.id,
    role: memberRole,
    is_primary: true,
  });

  // 5. If supplier, create supplier profile
  if (parsed.data.role === "supplier") {
    await serviceClient.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: parsed.data.countryCode,
    });
  }

  // 6. Send welcome email
  await sendWelcomeEmail(parsed.data.email, parsed.data.fullName);

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPassword(
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") as string };
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetPassword(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
