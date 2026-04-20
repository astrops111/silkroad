import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * GET /api/admin/orders — List all platform orders
 * Query params: status, search, limit, offset
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
    .from("purchase_orders")
    .select(
      `
      id, order_number, subtotal, total_shipping, total_tax, grand_total,
      currency, status, market_region, buyer_company_name, created_at,
      buyer_user_id,
      user_profiles!purchase_orders_buyer_user_id_fkey ( full_name, email, country_code )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,buyer_company_name.ilike.%${search}%`);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    console.error("[admin/orders]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Get supplier order counts per purchase order
  const poIds = (orders || []).map((o) => o.id);
  let supplierOrderMap: Record<string, { count: number; suppliers: string[] }> = {};

  if (poIds.length > 0) {
    const { data: sos } = await supabase
      .from("supplier_orders")
      .select("purchase_order_id, supplier_id, payment_gateway")
      .in("purchase_order_id", poIds);

    if (sos) {
      for (const so of sos) {
        if (!supplierOrderMap[so.purchase_order_id]) {
          supplierOrderMap[so.purchase_order_id] = { count: 0, suppliers: [] };
        }
        supplierOrderMap[so.purchase_order_id].count++;
        supplierOrderMap[so.purchase_order_id].suppliers.push(so.supplier_id);
      }
    }
  }

  // Get payment info
  let paymentMap: Record<string, string> = {};
  if (poIds.length > 0) {
    const { data: payments } = await supabase
      .from("payment_transactions")
      .select("purchase_order_id, gateway, status")
      .in("purchase_order_id", poIds);

    if (payments) {
      for (const p of payments) {
        if (p.purchase_order_id) {
          paymentMap[p.purchase_order_id] = p.gateway;
        }
      }
    }
  }

  const enriched = (orders || []).map((o) => ({
    ...o,
    supplierCount: supplierOrderMap[o.id]?.count || 0,
    paymentGateway: paymentMap[o.id] || null,
  }));

  return NextResponse.json({
    orders: enriched,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * PATCH /api/admin/orders — Update order status
 * Body: { orderId, status, type: "purchase" | "supplier" }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const supabase = await createClient();
  const { orderId, status: newStatus, type = "purchase" } = await request.json();

  if (!orderId || !newStatus) {
    return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
  }

  const table = type === "supplier" ? "supplier_orders" : "purchase_orders";

  const { error } = await supabase
    .from(table)
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    console.error("[admin/orders]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Log status change for supplier orders
  if (type === "supplier") {
    await supabase.from("order_status_history").insert({
      supplier_order_id: orderId,
      to_status: newStatus,
      reason: "Admin status update",
    });
  }

  return NextResponse.json({ success: true, orderId, newStatus });
}
