import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * POST /api/quotes/[id]/accept
 *
 * Buyer accepts a ready quote → creates a purchase_order + supplier_orders
 * so the payment endpoints (/api/payments/xtransfer, /mtn-momo, /stripe)
 * can operate on a normal order.
 *
 * The quote must have status = "ready" and a non-null total_amount.
 * On success, the quote status is updated to "accepted" and the
 * purchase_order_id is stored on the quote.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, country_code")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Fetch quote (RLS ensures buyer owns it)
  const { data: quote, error: qErr } = await supabase
    .from("buyer_quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (qErr || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "ready") {
    return NextResponse.json(
      { error: `Quote cannot be accepted in status "${quote.status}". It must be "ready".` },
      { status: 409 }
    );
  }
  if (!quote.total_amount) {
    return NextResponse.json({ error: "Quote has no calculated total" }, { status: 409 });
  }

  // Idempotency: if already accepted return the existing order
  if (quote.purchase_order_id) {
    return NextResponse.json({ success: true, orderId: quote.purchase_order_id });
  }

  // ── Per-supplier item split ───────────────────────────────────────────────
  type QuoteItem = {
    productId?: string;
    productName?: string;
    supplierId?: string;
    supplierName?: string;
    variantId?: string;
    variantName?: string;
    quantity?: number;
    unitPrice?: number;
    currency?: string;
  };
  const items = (quote.items as QuoteItem[]) ?? [];

  type SupplierGroup = { supplierId: string; items: QuoteItem[]; subtotal: number };
  const supplierMap: Record<string, SupplierGroup> = {};
  for (const item of items) {
    const sid = item.supplierId ?? "unknown";
    if (!supplierMap[sid]) supplierMap[sid] = { supplierId: sid, items: [], subtotal: 0 };
    supplierMap[sid].items.push(item);
    supplierMap[sid].subtotal += (item.unitPrice ?? 0) * (item.quantity ?? 1);
  }

  // ── Create purchase_order ─────────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  const orderNumber = `ORD-${date}-${rand}`;

  const { data: purchaseOrder, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      order_number:       orderNumber,
      buyer_user_id:      profile.id,
      buyer_company_name: quote.buyer_company_name ?? null,
      buyer_tax_id:       quote.buyer_tax_id ?? null,
      subtotal:           quote.product_subtotal ?? 0,
      total_shipping:     quote.shipping_cost ?? 0,
      total_tax:          quote.customs_duties ?? 0,
      grand_total:        quote.total_amount,
      currency:           quote.currency ?? "USD",
      status:             "pending_payment",
      cost_components:    quote.cost_components ?? null,
      market_region:      quote.destination_country ?? null,
      metadata: {
        source:             "buyer_quote_request",
        quoteId:            quote.id,
        quoteNumber:        quote.quote_number,
        destinationCountry: quote.destination_country,
        shippingMode:       quote.shipping_mode,
        incoterms:          quote.incoterms,
      },
    })
    .select("id")
    .single();

  if (poErr || !purchaseOrder) {
    console.error("[quotes/accept] purchase_order insert failed:", poErr);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // ── Create supplier_orders ────────────────────────────────────────────────
  const supplierOrderInserts = Object.values(supplierMap).map((group) => ({
    purchase_order_id: purchaseOrder.id,
    supplier_id:       group.supplierId,
    order_number:      `${orderNumber}-${group.supplierId.slice(0, 6).toUpperCase()}`,
    subtotal:          group.subtotal,
    shipping_fee:      0,
    tax:               0,
    grand_total:       group.subtotal,
    currency:          quote.currency ?? "USD",
    status:            "pending_payment",
    items:             group.items,
    payment_gateway:   "xtransfer",
  }));

  if (supplierOrderInserts.length > 0) {
    const { error: soErr } = await supabase.from("supplier_orders").insert(supplierOrderInserts);
    if (soErr) console.error("[quotes/accept] supplier_orders insert failed:", soErr);
  }

  // ── Mark quote as accepted ────────────────────────────────────────────────
  await supabase
    .from("buyer_quote_requests")
    .update({ status: "accepted", purchase_order_id: purchaseOrder.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true, orderId: purchaseOrder.id, orderNumber });
}
