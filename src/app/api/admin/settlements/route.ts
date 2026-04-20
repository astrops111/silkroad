import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";
import { randomBytes } from "crypto";

/**
 * GET /api/admin/settlements — List settlements with supplier info
 * Query params: status, supplierId, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("settlements")
    .select(
      `
      id, settlement_number, period_start, period_end,
      gross_sales, total_commission, total_tax_on_commission,
      logistics_charges, net_payout, currency, status,
      payout_method, payout_reference, mobile_money_phone,
      mobile_money_provider, stripe_transfer_id, paid_at, created_at,
      supplier_id,
      companies!settlements_supplier_id_fkey ( name, country_code )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin/settlements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Stats
  const { data: pendingSum } = await supabase
    .from("settlements")
    .select("net_payout")
    .eq("status", "pending");

  const totalPending = (pendingSum || []).reduce(
    (sum: number, s: { net_payout: number }) => sum + s.net_payout,
    0
  );

  const { data: paidThisMonth } = await supabase
    .from("settlements")
    .select("total_commission")
    .eq("status", "paid")
    .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const commissionThisMonth = (paidThisMonth || []).reduce(
    (sum: number, s: { total_commission: number }) => sum + s.total_commission,
    0
  );

  return NextResponse.json({
    settlements: data || [],
    total: count || 0,
    stats: {
      totalPending,
      commissionThisMonth,
      settlementCount: count || 0,
    },
    limit,
    offset,
  });
}

/**
 * POST /api/admin/settlements — Create a new settlement for a supplier
 * Body: { supplierId, periodStart, periodEnd }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { supplierId, periodStart, periodEnd } = await request.json();

  if (!supplierId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "Missing supplierId, periodStart, or periodEnd" },
      { status: 400 }
    );
  }

  // Get completed supplier orders in the period
  const { data: orders } = await supabase
    .from("supplier_orders")
    .select("id, total_amount, commission_rate, commission_amount, shipping_fee")
    .eq("supplier_id", supplierId)
    .eq("status", "completed")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd);

  if (!orders || orders.length === 0) {
    return NextResponse.json(
      { error: "No completed orders found for this period" },
      { status: 400 }
    );
  }

  const grossSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalCommission = orders.reduce((sum, o) => sum + (o.commission_amount || 0), 0);
  const logisticsCharges = orders.reduce((sum, o) => sum + (o.shipping_fee || 0), 0);
  const netPayout = grossSales - totalCommission - logisticsCharges;

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const settlementNumber = `STL-${date}-${rand}`;

  const { data: settlement, error } = await supabase
    .from("settlements")
    .insert({
      supplier_id: supplierId,
      settlement_number: settlementNumber,
      period_start: periodStart,
      period_end: periodEnd,
      gross_sales: grossSales,
      total_commission: totalCommission,
      logistics_charges: logisticsCharges,
      net_payout: netPayout,
      currency: "USD",
      status: "pending",
      supplier_order_ids: orders.map((o) => o.id),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/settlements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    settlementId: settlement.id,
    settlementNumber,
    grossSales,
    totalCommission,
    netPayout,
  });
}

/**
 * PATCH /api/admin/settlements — Process payout
 * Body: { settlementId, action: "process" | "mark_paid" | "fail" }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { settlementId, action } = await request.json();

  if (!settlementId || !action) {
    return NextResponse.json({ error: "Missing settlementId or action" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  switch (action) {
    case "process":
      updates.status = "processing";
      break;
    case "mark_paid":
      updates.status = "paid";
      updates.paid_at = new Date().toISOString();
      break;
    case "fail":
      updates.status = "failed";
      break;
    default:
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  }

  const { error } = await supabase
    .from("settlements")
    .update(updates)
    .eq("id", settlementId);

  if (error) {
    console.error("[admin/settlements]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, settlementId, action });
}
