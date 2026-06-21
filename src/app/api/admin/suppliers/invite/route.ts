import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

/**
 * POST /api/admin/suppliers/invite
 * Body: { email, companyName?, countryCode? }
 * Optionally pre-creates a supplier company record, then sends a Supabase auth invite email.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const email: string = (body.email || "").trim().toLowerCase();
  const companyName: string = (body.companyName || "").trim();
  const countryCode: string = ((body.countryCode || "CN") as string)
    .trim()
    .toUpperCase();

  const emailSchema = z.string().email();
  const emailResult = emailSchema.safeParse(email);
  if (!email || !emailResult.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const admin = createServiceClient();

  let companyId: string | undefined;

  if (companyName) {
    const { data: company, error: companyErr } = await admin
      .from("companies")
      .insert({
        name: companyName,
        slug: slugify(companyName),
        type: "supplier",
        country_code: countryCode,
        market_region: "cn",
        verification_status: "unverified",
        is_active: false,
      })
      .select("id")
      .single();

    if (companyErr) {
      console.error('[admin/suppliers/invite] create company failed:', companyErr);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await admin.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: countryCode,
    });

    companyId = company.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/supplier`;

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      invited_as: "supplier",
      ...(companyId ? { pending_company_id: companyId } : {}),
    },
  });

  if (inviteErr) {
    if (companyId) {
      await admin.from("supplier_profiles").delete().eq("company_id", companyId);
      await admin.from("companies").delete().eq("id", companyId);
    }
    console.error('[admin/suppliers/invite] invite user failed:', inviteErr);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ success: true, companyId });
}
