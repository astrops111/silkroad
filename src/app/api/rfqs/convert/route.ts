import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { UNLINKED_PRODUCT_ID } from "@/lib/orders";
import { calculateOrderTax } from "@/lib/tax";
import { onOrderCreated } from "@/lib/email/events";
import { findDealByRfq, attachToDealThread } from "@/lib/deals/threads";
import { postDealMessage } from "@/lib/deals/messages";
import { logActivity } from "@/lib/crm/activities";

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

  // H9: resolve profile so we can enforce ownership on the RFQ fetch
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { rfqId } = await request.json();
  if (!rfqId) return NextResponse.json({ error: "rfqId required" }, { status: 400 });

  // Get RFQ with awarded quotation — only the owning buyer may convert
  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select(`
      id, rfq_number, buyer_user_id, buyer_company_id, buyer_company_name,
      buyer_country, awarded_quotation_id, status, delivery_country, delivery_city,
      converted_order_id
    `)
    .eq("id", rfqId)
    .eq("buyer_user_id", profile.id)
    .single();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  }

  // Idempotency: if this RFQ was already converted (retry, double-submit, or
  // a race with a concurrent request), return the existing order instead of
  // creating a duplicate.
  if (rfq.converted_order_id) {
    return NextResponse.json({
      success: true,
      orderId: rfq.converted_order_id,
      message: "RFQ already converted to a purchase order.",
    });
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
        product_id, variant_id, specifications
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
  const rand = randomBytes(3).toString("hex").toUpperCase().substring(0, 6);
  const orderNumber = `ORD-${date}-${rand}`;
  const soNumber = `${orderNumber}-S1`;

  // Ownership + award status already verified above via the RLS-scoped
  // client. The writes below are cross-party (the buyer is creating a row
  // scoped to the supplier's company) — supplier_orders' RLS insert policy
  // only allows the supplier company or an admin, so it would otherwise
  // reject every buyer-initiated conversion. Use the service client for
  // these privileged writes now that authorization is established.
  const serviceClient = createServiceClient();

  // Create purchase order
  const { data: purchaseOrder, error: poError } = await serviceClient
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

  if (poError || !purchaseOrder) {
    console.error("[rfqs/convert] PO error:", poError);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
  const purchaseOrderId = purchaseOrder.id;

  // No DB transaction wraps these writes — any failure from here on must
  // clean up everything already committed in this call, not just the last step.
  async function rollbackOrder(supplierOrderId?: string) {
    if (supplierOrderId) {
      await serviceClient.from("supplier_order_items").delete().eq("supplier_order_id", supplierOrderId);
      await serviceClient.from("supplier_orders").delete().eq("id", supplierOrderId);
    }
    await serviceClient.from("purchase_orders").delete().eq("id", purchaseOrderId);
  }

  // Create supplier order
  const { data: supplierOrder, error: soError } = await serviceClient
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

  if (soError || !supplierOrder) {
    console.error("[rfqs/convert] SO error:", soError);
    await rollbackOrder();
    return NextResponse.json({ error: "Failed to create supplier order" }, { status: 500 });
  }

  // Create order items from quotation items
  const items = (quotation.quotation_items || []);
  if (items.length > 0) {
    const orderItems = items.map((qi: {
      product_name: string; quantity: number; unit_price: number; unit: string | null;
      total_price: number; product_id: string | null; variant_id: string | null;
      specifications: Record<string, unknown> | null;
    }) => ({
      supplier_order_id: supplierOrder.id,
      product_id: qi.product_id || UNLINKED_PRODUCT_ID,
      variant_id: qi.variant_id || null,
      product_name: qi.product_name,
      unit_price: qi.unit_price,
      quantity: qi.quantity,
      subtotal: qi.total_price,
      currency: quotation.currency,
      // qi.quantity is in qi.unit (e.g. "boxes"), not always pieces — keep
      // that context on the order line instead of a bare, ambiguous count.
      metadata: {
        unit: qi.unit || "pieces",
        ...(qi.specifications ?? {}),
      },
    }));

    const { error: itemsError } = await serviceClient.from("supplier_order_items").insert(orderItems);
    if (itemsError) {
      console.error("[rfqs/convert] supplier_order_items insert failed:", itemsError);
      await rollbackOrder(supplierOrder.id);
      return NextResponse.json({ error: "Failed to create order items" }, { status: 500 });
    }
  }

  // Update RFQ status to converted — conditioned on status still being
  // "awarded" so a concurrent request that already converted this RFQ loses
  // the race cleanly (0 rows updated) instead of both requests succeeding
  // and creating two orders for the same award.
  const { data: statusUpdate, error: statusErr } = await serviceClient
    .from("rfqs")
    .update({
      status: "converted",
      converted_order_id: purchaseOrder.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rfqId)
    .eq("status", "awarded")
    .select("id")
    .maybeSingle();

  if (statusErr || !statusUpdate) {
    console.error("[rfqs/convert] rfqs status update failed or lost race:", statusErr);
    await rollbackOrder(supplierOrder.id);
    // If a concurrent request won the race, return its order instead of a bare error.
    const { data: winner } = await serviceClient
      .from("rfqs")
      .select("converted_order_id")
      .eq("id", rfqId)
      .single();
    if (winner?.converted_order_id) {
      return NextResponse.json({
        success: true,
        orderId: winner.converted_order_id,
        message: "RFQ already converted to a purchase order.",
      });
    }
    return NextResponse.json({ error: "Failed to finalize RFQ conversion" }, { status: 500 });
  }

  // Notify buyer + supplier + ops (email and in-app); never blocks the conversion
  try {
    await onOrderCreated(purchaseOrder.id);
  } catch (err) {
    console.error("[rfqs/convert] Order notifications failed for", purchaseOrder.id, err);
  }

  // CRM: mark the deal won with the order attached
  const dealThreadId = await findDealByRfq(rfqId);
  if (dealThreadId) {
    await attachToDealThread(dealThreadId, {
      purchaseOrderId: purchaseOrder.id,
      supplierOrderId: supplierOrder.id,
      status: "won",
    });
  }
  await logActivity({
    activityType: "order_created",
    actorType: "user",
    actorUserId: profile.id,
    companyId: rfq.buyer_company_id,
    dealThreadId,
    referenceType: "purchase_order",
    referenceId: purchaseOrder.id,
    metadata: { orderNumber, grandTotal, currency: quotation.currency, rfqId },
  });
  // Internal-channel leg: record the order in the deal conversation
  if (dealThreadId) {
    await postDealMessage(dealThreadId, {
      body: `Order ${orderNumber} created from the awarded quote — ${quotation.currency} ${(grandTotal / 100).toFixed(2)}. Payment and logistics are next.`,
      actorUserId: profile.id,
      references: [
        { type: "order", id: purchaseOrder.id, label: orderNumber },
        { type: "quotation", id: quotation.id },
        { type: "rfq", id: rfqId },
      ],
    });
  }

  // Log activity
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
