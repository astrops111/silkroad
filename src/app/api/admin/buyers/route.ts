import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { sanitizeSearchTerm } from "@/lib/security/sanitize";
import { logAdminAction } from "@/lib/logging/admin-audit";

/**
 * GET /api/admin/buyers — List buyer companies with order/GMV rollups
 * Query params: id, search, limit, offset
 *
 * Credit limit has no dedicated column — stored in companies.settings.creditLimit
 * (a generic jsonb column already used elsewhere in this codebase for
 * per-company config) rather than adding a new schema column.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("companies")
    .select(
      "id, name, city, country_code, is_active, verification_status, settings, created_at",
      { count: "exact" }
    )
    .eq("type", "buyer_org")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (id) {
    query = query.eq("id", id);
  } else if (search) {
    const safeSearch = sanitizeSearchTerm(search).replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("name", `%${safeSearch}%`);
  }

  const { data: companies, error, count } = await query;

  if (error) {
    console.error("[admin/buyers]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const companyIds = (companies || []).map((c) => c.id);

  const [membersRes, ordersRes] = await Promise.all([
    companyIds.length
      ? supabase
          .from("company_members")
          .select("company_id, is_primary, user_profiles!user_id ( full_name, email )")
          .in("company_id", companyIds)
          .eq("role", "buyer")
      : Promise.resolve({ data: [] as { company_id: string; is_primary: boolean; user_profiles: { full_name: string | null; email: string | null } | null }[] }),
    companyIds.length
      ? supabase
          .from("purchase_orders")
          .select("buyer_company_id, grand_total, created_at, order_number")
          .in("buyer_company_id", companyIds)
      : Promise.resolve({ data: [] as { buyer_company_id: string | null; grand_total: number; created_at: string; order_number: string }[] }),
  ]);

  const contactByCompany: Record<string, { full_name: string | null; email: string | null }> = {};
  for (const m of membersRes.data || []) {
    if (m.is_primary || !contactByCompany[m.company_id]) {
      const profile = Array.isArray(m.user_profiles) ? m.user_profiles[0] : m.user_profiles;
      contactByCompany[m.company_id] = profile ?? { full_name: null, email: null };
    }
  }

  const statsByCompany: Record<string, { totalOrders: number; totalGmv: number; lastOrderAt: string | null }> = {};
  for (const o of ordersRes.data || []) {
    if (!o.buyer_company_id) continue;
    const stats = statsByCompany[o.buyer_company_id] ?? { totalOrders: 0, totalGmv: 0, lastOrderAt: null };
    stats.totalOrders += 1;
    stats.totalGmv += o.grand_total || 0;
    if (!stats.lastOrderAt || o.created_at > stats.lastOrderAt) stats.lastOrderAt = o.created_at;
    statsByCompany[o.buyer_company_id] = stats;
  }

  const enriched = (companies || []).map((c) => ({
    id: c.id,
    companyName: c.name,
    city: c.city,
    countryCode: c.country_code,
    isActive: c.is_active,
    verificationStatus: c.verification_status,
    creditLimit: (c.settings as Record<string, unknown> | null)?.creditLimit ?? null,
    createdAt: c.created_at,
    contact: contactByCompany[c.id] ?? null,
    totalOrders: statsByCompany[c.id]?.totalOrders ?? 0,
    totalGmv: statsByCompany[c.id]?.totalGmv ?? 0,
    lastOrderAt: statsByCompany[c.id]?.lastOrderAt ?? null,
  }));

  return NextResponse.json({ buyers: enriched, total: count || 0, limit, offset });
}

/**
 * PATCH /api/admin/buyers — Suspend/reinstate a buyer or set their credit limit
 * Body: { companyId, action: "suspend" | "reinstate" | "set_credit_limit", creditLimit? }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { companyId, action, creditLimit } = (await request.json()) as {
    companyId?: string;
    action?: "suspend" | "reinstate" | "set_credit_limit";
    creditLimit?: number | null;
  };

  if (!companyId || !action) {
    return NextResponse.json({ error: "companyId and action are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, settings")
    .eq("id", companyId)
    .eq("type", "buyer_org")
    .single();

  if (!company) {
    return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  }

  if (action === "suspend" || action === "reinstate") {
    const { error } = await supabase
      .from("companies")
      .update({ is_active: action === "reinstate", updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (error) return NextResponse.json({ error: "Failed to update buyer" }, { status: 500 });
  } else if (action === "set_credit_limit") {
    const settings = { ...((company.settings as Record<string, unknown>) ?? {}), creditLimit: creditLimit ?? null };
    const { error } = await supabase
      .from("companies")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (error) return NextResponse.json({ error: "Failed to update credit limit" }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await logAdminAction({
    adminId: auth.profile.id,
    actionType: `buyer_${action}`,
    targetEntity: "companies",
    targetId: companyId,
    targetLabel: company.name,
    supportingEvidence: action === "set_credit_limit" ? { creditLimit } : undefined,
  });

  return NextResponse.json({ success: true });
}
