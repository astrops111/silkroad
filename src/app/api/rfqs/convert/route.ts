import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateOrderTax } from "@/lib/tax";

/**
 * POST /api/rfqs/convert — Convert an awarded RFQ into a purchase order
 * Body: { rfqId }
 *
 * Flow:
 * 1. Verify RFQ is awarded and has an accepted quotation
 * 2. Get quotation details + line items
 * 3. Create purchase_order + supplier_order + items
 * 4. Update RFQ status to "converted"
 * 5. Return order details
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rfqId } = await request.json();
  if (!rfqId) return NextResponse.json({ error: "rfqId required" }, { status: 400 });

  // Get RFQ with awarded quotation
  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select(`
      id, rfq_number, buyer_user_id, buyer_company_id, buyer_company_name,
      buyer_country, awarded_quotation_id, status, delivery_country, delivery_city
    `)
    .eq("id", rfqId)
    .single();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  }

  if (rfq.status !== "awarded") {
    return NextResponse.json({ error: "RFQ must be awarded before converting" }, { status: 400 });
  }

  if (!rfq.awarded_quotation_id) {
    return NextResponse.json({ error: "No awarded quotation found" }, { status: 400 });
  }

  // Get accepted quotation with items
  const { data: quotation } = await supabase
    .from("quotations")
    .select(`
      id, supplier_id, supplier_name, total_amount, currency,
      payment_terms, trade_term, lead_time_days, shipping_cost,
      shipping_method,
      quotation_items (
        id, product_name, quantity, unit, unit_price, total_price,
        product_id, variant_id
      )
    `)
    .eq("id", rfq.awarded_quotation_id)
    .single();

  if (!quotation) {
    return NextResponse.json({ error: "Awarded quotation not found" }, { status: 404 });
  }

  // Get supplier country for tax calculation
  const { data: supplier } = await supabase
    .from("companies")
    .select("country_code")
    .eq("id", quotation.supplier_id)
    .single();

  // Calculate tax
  const taxResult = calculateOrderTax({
    subtotal: quotation.total_amount,
    currency: quotation.currency,
    supplierCountry: supplier?.country_code || "GH",
    buyerCountry: rfq.buyer_country || "GH",
  });

  const shippingFee = quotation.shipping_cost || 0;
  const grandTotal = quotation.total_amount + taxResult.breakdown.totalTax + shippingFee;

  // Generate order numbers
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderNumber = `ORD-${date}-${rand}`;
  const soNumber = `${orderNumber}-S1`;

  // Create purchase order
  const { data: purchaseOrder, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      order_number: orderNumber,
      buyer_user_id: rfq.buyer_user_id,
      buyer_company_id: rfq.buyer_company_id,
      subtotal: quotation.total_amount,
      total_shipping: shippingFee,
      total_tax: taxResult.breakdown.totalTax,
      grand_total: grandTotal,
      currency: quotation.currency,
      status: "pending_payment",
      buyer_company_name: rfq.buyer_company_name,
    })
    .select("id")
    .single();

  if (poError) {
    return NextResponse.json({ error: `Failed to create order: ${poError.message}` }, { status: 500 });
  }

  // Create supplier order
  const { data: supplierOrder, error: soError } = await supabase
    .from("supplier_orders")
    .insert({
      purchase_order_id: purchaseOrder.id,
      supplier_id: quotation.supplier_id,
      order_number: soNumber,
      subtotal: quotation.total_amount,
      shipping_fee: shippingFee,
      tax_amount: taxResult.breakdown.totalTax,
      total_amount: grandTotal,
      currency: quotation.currency,
      shipping_method: quotation.shipping_method || null,
      trade_term: quotation.trade_term || null,
      ship_to_country: rfq.delivery_country,
      ship_to_city: rfq.delivery_city,
      status: "pending_payment",
      payment_gateway: null,
    })
    .select("id")
    .single();

  if (soError) {
    return NextResponse.json({ error: `Failed to create supplier order: ${soError.message}` }, { status: 500 });
  }

  // Create order items from quotation items
  const items = (quotation.quotation_items || []);
  if (items.length > 0) {
    const orderItems = items.map((qi: {
      product_name: string; quantity: number; unit_price: number;
      total_price: number; product_id: string | null; variant_id: string | null;
    }) => ({
      supplier_order_id: supplierOrder.id,
      product_id: qi.product_id || "00000000-0000-0000-0000-000000000000",
      variant_id: qi.variant_id || null,
      product_name: qi.product_name,
      unit_price: qi.unit_price,
      quantity: qi.quantity,
      subtotal: qi.total_price,
      currency: quotation.currency,
    }));

    await supabase.from("supplier_order_items").insert(orderItems);
  }

  // Update RFQ status to converted
  await supabase
    .from("rfqs")
    .update({
      status: "converted",
      converted_order_id: purchaseOrder.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rfqId);

  // Log activity
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfqId,
    quotation_id: quotation.id,
    actor_user_id: profile?.id,
    action: "converted",
    details: {
      orderNumber,
      purchaseOrderId: purchaseOrder.id,
      grandTotal,
      currency: quotation.currency,
    },
  });

  return NextResponse.json({
    success: true,
    orderId: purchaseOrder.id,
    orderNumber,
    grandTotal,
    currency: quotation.currency,
    message: "RFQ converted to purchase order. Proceed to payment.",
  });
}
