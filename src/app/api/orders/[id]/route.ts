import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/orders/[id] — Full order detail
 * Returns the purchase order with all supplier sub-orders, line items, and status history.
 * Only accessible by the buyer who placed the order.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { id } = await params;

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select(
      `id, order_number, status, currency, subtotal, total_shipping, total_tax, grand_total,
       buyer_company_id, buyer_company_name, buyer_tax_id, note, created_at,
       supplier_orders (
         id, order_number, supplier_id, status, subtotal, shipping_fee, tax_amount,
         total_amount, currency, created_at,
         companies ( name, country_code ),
         supplier_order_items (
           id, product_id, product_name, variant_name, unit_price, quantity, subtotal, currency
         ),
         order_status_history (
           id, status, changed_at, note
         )
       )`
    )
    .eq("id", id)
    .eq("buyer_user_id", profile.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
