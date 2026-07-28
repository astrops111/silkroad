"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/user";
import { logAdminAction } from "@/lib/logging/admin-audit";
import { sendEmail } from "@/lib/email";

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
  const membership = user?.company_members?.find((m) =>
    MANAGE_ROLES.includes(m.role)
  );
  if (!membership) {
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

function slugify(text: string): string {
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

export async function updateSupplierApplicationStatus(
  id: string,
  status: "pending" | "in_review" | "approved" | "rejected" | "contacted",
  adminNotes?: string
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: app } = await service
    .from("supplier_applications")
    .select("id, full_name, email, company_name, country_code, city, website, status, company_id")
    .eq("id", id)
    .single();
  if (!app) return { success: false, error: "Application not found" };

  let companyId: string | null = app.company_id ?? null;

  // Approval provisions the supplier account: company shell + profile + auth
  // invite to the applicant. company_id doubles as the idempotency marker so
  // re-approving never creates a second company.
  if (status === "approved" && !companyId) {
    const countryCode = (app.country_code || "KE").toUpperCase();
    const { data: company, error: coErr } = await service
      .from("companies")
      .insert({
        name: app.company_name,
        slug: slugify(app.company_name),
        type: "supplier",
        country_code: countryCode,
        city: app.city || null,
        website: app.website || null,
        market_region: "global",
        verification_status: "unverified",
        is_active: false,
      })
      .select("id")
      .single();
    if (coErr || !company) {
      return { success: false, error: coErr?.message ?? "Company creation failed" };
    }

    await service.from("supplier_profiles").insert({
      company_id: company.id,
      factory_country: countryCode,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { error: inviteErr } = await service.auth.admin.inviteUserByEmail(
      app.email,
      {
        redirectTo: `${appUrl}/auth/callback?next=/supplier`,
        data: { invited_as: "supplier", pending_company_id: company.id },
      }
    );

    if (inviteErr) {
      // Applicant may already have an account (e.g. registered as a buyer) —
      // attach the membership directly instead of failing the approval.
      const { data: existing } = await service
        .from("user_profiles")
        .select("id")
        .ilike("email", app.email)
        .maybeSingle();
      if (existing) {
        const { error: memberErr } = await service.from("company_members").insert({
          company_id: company.id,
          user_id: existing.id,
          role: "supplier_owner",
          is_primary: false,
        });
        if (memberErr) {
          await service.from("supplier_profiles").delete().eq("company_id", company.id);
          await service.from("companies").delete().eq("id", company.id);
          return { success: false, error: `Could not attach existing user: ${memberErr.message}` };
        }
      } else {
        // Roll back so a retry can re-provision cleanly.
        await service.from("supplier_profiles").delete().eq("company_id", company.id);
        await service.from("companies").delete().eq("id", company.id);
        return { success: false, error: `Invite failed: ${inviteErr.message}` };
      }
    }
    companyId = company.id;
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.userId,
    ...(companyId ? { company_id: companyId } : {}),
  };
  if (adminNotes !== undefined) patch.admin_notes = adminNotes;

  const { error } = await supabase
    .from("supplier_applications")
    .update(patch)
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  if (status === "rejected") {
    await sendEmail(
      {
        to: app.email,
        subject: "Your SilkRoad Africa supplier application",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#14110F;">
            <h1 style="margin:0 0 12px 0;font-size:18px;">About your supplier application</h1>
            <p style="font-size:14px;line-height:1.6;">Hello ${app.full_name},</p>
            <p style="font-size:14px;line-height:1.6;">Thank you for applying to sell on SilkRoad Africa as ${app.company_name}. After review, we are unable to approve your application at this time.</p>
            ${adminNotes ? `<p style="font-size:14px;line-height:1.6;padding:12px;background:#fafafa;border-radius:8px;"><strong>Reviewer note:</strong> ${adminNotes.replace(/</g, "&lt;")}</p>` : ""}
            <p style="font-size:14px;line-height:1.6;">You are welcome to reapply with updated information.</p>
          </div>
        `,
      },
      "supplier_application_rejected"
    );
  }

  await logAdminAction({
    adminId: gate.userId,
    actionType: `supplier_application_${status}`,
    targetEntity: "supplier_application",
    targetId: id,
    targetLabel: app.company_name,
    reason: adminNotes || undefined,
    supportingEvidence: companyId ? { companyId } : undefined,
  });

  revalidatePath("/admin/supplier-applications");
  revalidatePath(`/admin/supplier-applications/${id}`);
  return { success: true };
}
