"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { onBuyerRequestSubmitted } from "@/lib/email/events";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: "invalid_input" | "db_error";
};

export interface SubmitBuyerRequestInput {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  countryCode?: string;
  category?: string;
  title: string;
  description: string;
  quantity?: string;
  budgetUsd?: string;
  timeline?: string;
  locale?: string;
  sourcePath?: string;
}

function clean(v: string | undefined, max = 500): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function submitBuyerRequest(
  input: SubmitBuyerRequestInput
): Promise<ActionResult<{ id: string }>> {
  const name = clean(input.name, 120);
  const email = clean(input.email, 200);
  const title = clean(input.title, 200);
  const description = clean(input.description, 4000);

  if (!name || !email || !title || !description) {
    return {
      success: false,
      error: "Name, email, title, and description are required.",
      code: "invalid_input",
    };
  }
  if (!email.includes("@")) {
    return { success: false, error: "Invalid email.", code: "invalid_input" };
  }

  // Resolve signed-in buyer (if any) so ops can link back to the account.
  let buyerUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (profile) buyerUserId = profile.id;
    }
  } catch {
    // Anonymous submission is fine.
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("buyer_requests")
    .insert({
      buyer_user_id: buyerUserId,
      name,
      email: email.toLowerCase(),
      phone: clean(input.phone, 40),
      company_name: clean(input.companyName, 200),
      country_code: clean(input.countryCode, 8),
      category: clean(input.category, 80),
      title,
      description,
      quantity: clean(input.quantity, 80),
      budget_usd: clean(input.budgetUsd, 80),
      timeline: clean(input.timeline, 80),
      locale: clean(input.locale, 8),
      source_path: clean(input.sourcePath, 300),
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to submit request.",
      code: "db_error",
    };
  }

  // Fire-and-forget notification; don't block the user if email fails.
  onBuyerRequestSubmitted(data.id).catch((err) => {
    console.error("[buyer-request] ops notification failed:", err);
  });

  return { success: true, data: { id: data.id } };
}
