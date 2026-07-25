import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/orders/[id] — Full order detail
 * Returns the purchase order with all supplier sub-orders, line items, and status history.
 * Only accessible by the buyer who placed the order.
 *
 * Manual multi-step fetch instead of a PostgREST embed: supplier_orders has
 * no FK to purchase_orders, and supplier_order_items/order_status_history/
 * companies have no FK to supplier_orders either — all of these tables are
 * RANGE-partitioned by created_at with a composite (id, created_at) PK, which
 * blocks a plain single-column FK on the referencing side. PostgREST can only
 * embed across a real FK, so every level of this join has to be done by hand.
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
       buyer_company_id, buyer_company_name, buyer_tax_id, note, created_at, metadata`
    )
    .eq("id", id)
    .eq("buyer_user_id", profile.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Buyer credit-history stats — used by PaymentTermsSelector (net-30/60
  // eligibility) on the payment page. Computed here so the page doesn't
  // need a second round-trip; PATCH /api/orders/[id]/payment-terms
  // re-derives these itself server-side rather than trusting this response.
  let buyerStats = { verified: false, totalOrders: 0, totalSpend: 0 };
  if (order.buyer_company_id) {
    const [{ data: company }, { data: history }] = await Promise.all([
      supabase.from("companies").select("is_verified").eq("id", order.buyer_company_id).single(),
      supabase
        .from("purchase_orders")
        .select("grand_total")
        .eq("buyer_company_id", order.buyer_company_id)
        .not("status", "in", "(draft,pending_approval,pending_payment,cancelled)"),
    ]);
    buyerStats = {
      verified: company?.is_verified ?? false,
      totalOrders: history?.length ?? 0,
      totalSpend: (history ?? []).reduce((sum, o) => sum + (o.grand_total ?? 0), 0),
    };
  }

  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select(
      `id, order_number, supplier_id, status, subtotal, shipping_fee, tax_amount,
       total_amount, currency, created_at`
    )
    .eq("purchase_order_id", id)
    .order("created_at", { ascending: true });

  const soIds = (supplierOrders ?? []).map((so) => so.id);
  const supplierIds = [...new Set((supplierOrders ?? []).map((so) => so.supplier_id))];

  const [{ data: companies }, { data: items }, { data: history }] = await Promise.all([
    supplierIds.length
      ? supabase.from("companies").select("id, name, country_code").in("id", supplierIds)
      : Promise.resolve({ data: [] as { id: string; name: string; country_code: string }[] }),
    soIds.length
      ? supabase
          .from("supplier_order_items")
          .select("id, supplier_order_id, product_id, product_name, variant_name, unit_price, quantity, subtotal, currency")
          .in("supplier_order_id", soIds)
      : Promise.resolve({
          data: [] as {
            id: string; supplier_order_id: string; product_id: string; product_name: string;
            variant_name: string | null; unit_price: number; quantity: number; subtotal: number; currency: string;
          }[],
        }),
    soIds.length
      ? supabase
          .from("order_status_history")
          .select("id, supplier_order_id, to_status, reason, created_at")
          .in("supplier_order_id", soIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as {
            id: string; supplier_order_id: string; to_status: string; reason: string | null; created_at: string;
          }[],
        }),
  ]);

  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const itemsBySo = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const list = itemsBySo.get(item.supplier_order_id) ?? [];
    list.push(item);
    itemsBySo.set(item.supplier_order_id, list);
  }
  const historyBySo = new Map<string, typeof history>();
  for (const h of history ?? []) {
    const list = historyBySo.get(h.supplier_order_id) ?? [];
    list.push(h);
    historyBySo.set(h.supplier_order_id, list);
  }

  const fullOrder = {
    ...order,
    supplier_orders: (supplierOrders ?? []).map((so) => ({
      ...so,
      companies: companyById.get(so.supplier_id) ?? null,
      supplier_order_items: itemsBySo.get(so.id) ?? [],
      // Aliased to match the buyer UI's StatusEntry shape (status/changed_at/note)
      // without needing every render site to learn the real column names.
      order_status_history: (historyBySo.get(so.id) ?? []).map((h) => ({
        id: h.id,
        status: h.to_status,
        changed_at: h.created_at,
        note: h.reason,
      })),
    })),
  };

  return NextResponse.json({ order: fullOrder, buyerStats });
}
