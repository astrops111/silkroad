import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

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
  const { supplierId, action } = await request.json();

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
    return NextResponse.json({ error: companyError.message }, { status: 500 });
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

  return NextResponse.json({
    success: true,
    supplierId,
    action,
    newStatus,
  });
}
