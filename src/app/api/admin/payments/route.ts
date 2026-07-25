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
      amount, currency, amount_in_usd, status, payment_terms, balance_due_at,
      created_at, updated_at, expires_at, raw_request
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

  const { data: paymentRows, error, count } = await query;

  if (error) {
    console.error("[admin/payments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // No FK between payment_transactions.purchase_order_id and purchase_orders
  // (partitioned, composite PK) — PostgREST can't embed it, fetch separately.
  const poIds = [...new Set((paymentRows ?? []).map((p) => p.purchase_order_id).filter((v): v is string => !!v))];
  const { data: orders } = poIds.length
    ? await supabase.from("purchase_orders").select("id, order_number, buyer_company_name, market_region, buyer_user_id").in("id", poIds)
    : { data: [] as { id: string; order_number: string; buyer_company_name: string | null; market_region: string | null; buyer_user_id: string }[] };

  const buyerUserIds = [...new Set((orders ?? []).map((o) => o.buyer_user_id).filter(Boolean))];
  const { data: buyers } = buyerUserIds.length
    ? await supabase.from("user_profiles").select("id, full_name, country_code").in("id", buyerUserIds)
    : { data: [] as { id: string; full_name: string | null; country_code: string | null }[] };
  const buyerById = new Map((buyers ?? []).map((b) => [b.id, b]));
  const orderById = new Map(
    (orders ?? []).map((o) => [
      o.id,
      {
        order_number: o.order_number,
        buyer_company_name: o.buyer_company_name,
        market_region: o.market_region,
        user_profiles: buyerById.get(o.buyer_user_id) ?? null,
      },
    ])
  );

  const payments = (paymentRows ?? []).map((p) => ({
    ...p,
    order: p.purchase_order_id ? orderById.get(p.purchase_order_id) ?? null : null,
  }));

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

/**
 * PATCH /api/admin/payments — Mark a manual/net-terms payment reconciled.
 * Body: { id: string, action: "mark_reconciled" }
 *
 * Only for gateway: "bank_transfer" transactions in "processing" status —
 * the invoice record created by PATCH /api/orders/[id]/payment-terms for a
 * net-30/60 order (order fulfillment already started when the terms were
 * chosen; this just confirms the wire actually landed). Real gateway
 * transactions reconcile themselves via webhook, not this action.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id, action } = await request.json();
  if (!id || action !== "mark_reconciled") {
    return NextResponse.json({ error: "id and action=mark_reconciled are required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, gateway, status")
    .eq("id", id)
    .single();

  if (!tx) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (tx.gateway !== "bank_transfer" || tx.status !== "processing") {
    return NextResponse.json(
      { error: "Only a processing bank_transfer (manual/net-terms) payment can be marked reconciled" },
      { status: 400 }
    );
  }

  await supabase
    .from("payment_transactions")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
