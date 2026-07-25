import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { sanitizeSearchTerm } from "@/lib/security/sanitize";

/**
 * GET /api/admin/payments — Transaction ledger across all gateways
 * Query params: id, status, gateway, search, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const status = searchParams.get("status");
  const gateway = searchParams.get("gateway");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("payment_transactions")
    .select(
      `
      id, purchase_order_id, supplier_order_id, gateway, gateway_transaction_id,
      amount, currency, amount_in_usd, status, created_at, updated_at, expires_at,
      raw_request,
      order:purchase_order_id (
        order_number, buyer_company_name, market_region,
        user_profiles!purchase_orders_buyer_user_id_fkey ( full_name, country_code )
      )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (id) {
    query = query.eq("id", id);
  } else {
    if (status) query = query.eq("status", status);
    if (gateway) query = query.eq("gateway", gateway);
    if (search) {
      const safeSearch = sanitizeSearchTerm(search).replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(`gateway_transaction_id.ilike.%${safeSearch}%,id.eq.${safeSearch}`);
    }
  }

  const { data: payments, error, count } = await query;

  if (error) {
    console.error("[admin/payments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // KPIs over the last 30 days — separate lightweight aggregate queries
  // rather than pulling every row into memory.
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [volumeRes, successRes, failedRes, refundedRes] = await Promise.all([
    supabase.from("payment_transactions").select("amount_in_usd, amount, currency").eq("status", "succeeded").gte("created_at", since30d),
    supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "succeeded").gte("created_at", since30d),
    supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since30d),
    supabase.from("payment_transactions").select("amount").eq("status", "refunded").gte("created_at", since30d),
  ]);

  const totalVolumeUsdCents = (volumeRes.data || []).reduce(
    (sum, t) => sum + (t.amount_in_usd ?? (t.currency === "USD" ? t.amount : 0)),
    0
  );
  const totalRefundedCents = (refundedRes.data || []).reduce((sum, t) => sum + (t.amount || 0), 0);

  return NextResponse.json({
    payments: payments || [],
    total: count || 0,
    limit,
    offset,
    kpis: {
      totalVolumeUsd30d: totalVolumeUsdCents,
      successfulCount30d: successRes.count || 0,
      failedCount30d: failedRes.count || 0,
      refundedUsd30d: totalRefundedCents,
    },
  });
}
