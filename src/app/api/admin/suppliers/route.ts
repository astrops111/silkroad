import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireSuperAdmin, isAuthError } from "@/lib/auth/guard";
import { logAdminAction } from "@/lib/logging/admin-audit";
import { sendEmail } from "@/lib/email";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "") +
    "-" + Math.random().toString(36).slice(2, 7);
}

/**
 * GET /api/admin/suppliers — List all suppliers with profiles and stats
 * Query params: status (unverified|pending|verified|rejected|expired), search, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("companies")
    .select(
      `
      id, name, name_local, slug, country_code, city, default_currency,
      market_region, industry, verification_status, is_active, created_at,
      tax_id, tax_id_verified,
      supplier_profiles (
        id, tier, commission_rate, response_rate, on_time_delivery_rate,
        average_rating, total_orders, total_revenue, mobile_money_number,
        mobile_money_provider, stripe_account_id, business_license_url
      )
    `,
      { count: "exact" }
    )
    .eq("type", "supplier")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("verification_status", status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,country_code.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin/suppliers]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Get product counts per supplier
  const supplierIds = (data || []).map((s) => s.id);
  let productCounts: Record<string, number> = {};

  if (supplierIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("supplier_id")
      .in("supplier_id", supplierIds);

    if (products) {
      productCounts = products.reduce(
        (acc: Record<string, number>, p: { supplier_id: string }) => {
          acc[p.supplier_id] = (acc[p.supplier_id] || 0) + 1;
          return acc;
        },
        {}
      );
    }
  }

  const suppliers = (data || []).map((s) => ({
    ...s,
    productCount: productCounts[s.id] || 0,
  }));

  return NextResponse.json({
    suppliers,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * PATCH /api/admin/suppliers — Update supplier verification status
 * Body: { supplierId, action: "approve" | "reject" | "suspend" | "reinstate" }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { supplierId, action, reason } = await request.json();

  if (!supplierId || !action) {
    return NextResponse.json(
      { error: "Missing supplierId or action" },
      { status: 400 }
    );
  }

  const statusMap: Record<string, string> = {
    approve: "verified",
    reject: "rejected",
    suspend: "expired", // using 'expired' as suspended equivalent in the enum
    reinstate: "verified",
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    return NextResponse.json(
      { error: `Invalid action: ${action}. Use approve, reject, suspend, or reinstate` },
      { status: 400 }
    );
  }

  // Update company verification status
  const { error: companyError } = await supabase
    .from("companies")
    .update({
      verification_status: newStatus,
      is_active: action !== "suspend" && action !== "reject",
      ...(action === "approve" ? { verified_at: new Date().toISOString() } : {}),
    })
    .eq("id", supplierId);

  if (companyError) {
    console.error('[admin/suppliers] status update failed:', companyError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // If suspending, deactivate all their products
  if (action === "suspend") {
    await supabase
      .from("products")
      .update({ is_active: false })
      .eq("supplier_id", supplierId);
  }

  // If reinstating, reactivate approved products
  if (action === "reinstate") {
    await supabase
      .from("products")
      .update({ is_active: true })
      .eq("supplier_id", supplierId)
      .eq("moderation_status", "approved");
  }

  // Audit + notify the supplier owners (fire-and-forget: the status change
  // already succeeded, so notification failures must not fail the request).
  try {
    const service = createServiceClient();
    const [{ data: company }, { data: owners }] = await Promise.all([
      service.from("companies").select("name").eq("id", supplierId).single(),
      service
        .from("company_members")
        .select("role, user_profiles!user_id ( id, email, full_name )")
        .eq("company_id", supplierId)
        .eq("role", "supplier_owner"),
    ]);

    await logAdminAction({
      adminId: auth.profile.id,
      actionType: `supplier_${action}`,
      targetEntity: "company",
      targetId: supplierId,
      targetLabel: company?.name ?? undefined,
      reason: reason || undefined,
      supportingEvidence: { newStatus },
    });

    const approved = action === "approve" || action === "reinstate";
    const notifType = approved ? "supplier_verified" : "supplier_suspended";
    const subject = approved
      ? `Your supplier account on SilkRoad Africa is ${action === "approve" ? "verified" : "reinstated"}`
      : action === "reject"
      ? "Your SilkRoad Africa verification was not approved"
      : "Your SilkRoad Africa supplier account has been suspended";
    const bodyLine = approved
      ? "Your verification is complete — your listings are live and settlement payouts are unblocked."
      : action === "reject"
      ? "Your verification submission was not approved. Please review the note below, update your documents, and resubmit from Settings → Verification."
      : "Your supplier account has been suspended and your listings are no longer visible.";

    type OwnerRow = {
      user_profiles: { id: string; email: string | null; full_name: string | null }[] | null;
    };
    await Promise.all(
      ((owners ?? []) as OwnerRow[]).flatMap((o) => {
        const profile = o.user_profiles?.[0];
        if (!profile) return [];
        const tasks: Promise<unknown>[] = [
          Promise.resolve(
            service.rpc("create_notification", {
              p_user_id: profile.id,
              p_company_id: supplierId,
              p_title: approved ? "Verification approved" : action === "reject" ? "Verification rejected" : "Account suspended",
              p_body: reason ? `${bodyLine} Note: ${reason}` : bodyLine,
              p_type: notifType,
              p_icon: approved ? "shield-check" : "shield-alert",
              p_action_url: "/supplier/verification",
            })
          ),
        ];
        if (profile.email) {
          tasks.push(
            sendEmail(
              {
                to: profile.email,
                subject,
                html: `
                  <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#14110F;">
                    <h1 style="margin:0 0 12px 0;font-size:18px;">${subject}</h1>
                    <p style="font-size:14px;line-height:1.6;">Hello ${profile.full_name ?? ""},</p>
                    <p style="font-size:14px;line-height:1.6;">${bodyLine}</p>
                    ${reason ? `<p style="font-size:14px;line-height:1.6;padding:12px;background:#fafafa;border-radius:8px;"><strong>Reviewer note:</strong> ${String(reason).replace(/</g, "&lt;")}</p>` : ""}
                  </div>
                `,
              },
              `supplier_${action}`
            )
          );
        }
        return tasks;
      })
    );
  } catch (notifyErr) {
    console.error("[admin/suppliers] post-decision notify failed:", notifyErr);
  }

  return NextResponse.json({
    success: true,
    supplierId,
    action,
    newStatus,
  });
}

/**
 * POST /api/admin/suppliers — Create a new supplier company + profile
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const body = await request.json();
  const {
    name, nameLocal, countryCode, city, stateProvince, industry,
    website, description, marketRegion, taxId,
    factoryCountry, moqDefault, leadTimeDays, tradeTerms, commissionRate,
  } = body;

  if (!name || !countryCode) {
    return NextResponse.json({ error: "name and countryCode are required" }, { status: 400 });
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({
      name,
      name_local: nameLocal || null,
      slug: slugify(name),
      type: "supplier",
      country_code: countryCode,
      city: city || null,
      state_province: stateProvince || null,
      industry: industry || null,
      website: website || null,
      description: description || null,
      market_region: marketRegion || "global",
      tax_id: taxId || null,
      verification_status: "unverified",
      is_active: true,
    })
    .select("id")
    .single();

  if (companyErr) {
    console.error('[admin/suppliers] create company failed:', companyErr);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const { error: profileErr } = await supabase.from("supplier_profiles").insert({
    company_id: company.id,
    factory_country: factoryCountry || countryCode,
    moq_default: moqDefault || null,
    lead_time_days_default: leadTimeDays || null,
    trade_terms_default: tradeTerms || null,
    commission_rate: commissionRate || null,
  });

  if (profileErr) {
    await supabase.from("companies").delete().eq("id", company.id);
    console.error('[admin/suppliers] create supplier_profile failed:', profileErr);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ success: true, supplierId: company.id }, { status: 201 });
}

/**
 * PUT /api/admin/suppliers — Update supplier company + profile fields
 * Body: { supplierId, ...fields }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const body = await request.json();
  const { supplierId, factoryCountry, moqDefault, leadTimeDays, tradeTerms, commissionRate, ...companyFields } = body;

  if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

  const companyAllowed = ["name", "name_local", "country_code", "city", "state_province", "industry", "website", "description", "market_region", "tax_id", "tax_id_verified"];
  const companyUpdate: Record<string, unknown> = {};
  for (const key of companyAllowed) {
    if (companyFields[key] !== undefined) companyUpdate[key] = companyFields[key];
  }

  if (Object.keys(companyUpdate).length > 0) {
    companyUpdate.updated_at = new Date().toISOString();
    const { error } = await supabase.from("companies").update(companyUpdate).eq("id", supplierId);
    if (error) {
      console.error('[admin/suppliers] update company fields failed:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const profileUpdate: Record<string, unknown> = {};
  if (factoryCountry !== undefined) profileUpdate.factory_country = factoryCountry;
  if (moqDefault !== undefined) profileUpdate.moq_default = moqDefault;
  if (leadTimeDays !== undefined) profileUpdate.lead_time_days_default = leadTimeDays;
  if (tradeTerms !== undefined) profileUpdate.trade_terms_default = tradeTerms;
  if (commissionRate !== undefined) profileUpdate.commission_rate = commissionRate;

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updated_at = new Date().toISOString();
    await supabase.from("supplier_profiles").update(profileUpdate).eq("company_id", supplierId);
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/suppliers?id= — Soft-delete supplier (super admin only)
 * Deactivates company and all their products.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isAuthError(auth)) return auth;

  const supplierId = request.nextUrl.searchParams.get("id");
  if (!supplierId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();

  await supabase.from("products").update({ is_active: false }).eq("supplier_id", supplierId);

  const { error } = await supabase
    .from("companies")
    .update({ is_active: false, verification_status: "rejected" })
    .eq("id", supplierId);

  if (error) {
    console.error('[admin/suppliers] soft-delete failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
