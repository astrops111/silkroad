import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/buyer/payments — List buyer's payment transactions
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Get buyer's purchase orders
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("id, order_number")
    .eq("buyer_user_id", profile.id);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ payments: [] });
  }

  const orderIds = orders.map((o) => o.id);
  const orderMap = new Map(orders.map((o) => [o.id, o.order_number]));

  const { data: payments } = await supabase
    .from("payment_transactions")
    .select("id, gateway, status, amount, currency, purchase_order_id, mobile_money_phone, created_at")
    .in("purchase_order_id", orderIds)
    .order("created_at", { ascending: false });

  const enriched = (payments || []).map((p) => ({
    ...p,
    order_number: orderMap.get(p.purchase_order_id) || "",
  }));

  return NextResponse.json({ payments: enriched });
}
