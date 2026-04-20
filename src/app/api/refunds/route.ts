import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/refunds — Initiate a refund for a supplier order
 * Body: { supplierOrderId, reason, amount?, type: "full" | "partial" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supplierOrderId, reason, amount, type = "full" } = await request.json();

  if (!supplierOrderId || !reason) {
    return NextResponse.json({ error: "supplierOrderId and reason are required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Fetch the supplier order
  const { data: order } = await serviceClient
    .from("supplier_orders")
    .select("id, status, total_amount, currency, purchase_order_id, supplier_id")
    .eq("id", supplierOrderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only allow refunds on paid/delivered orders
  if (!["paid", "delivered", "completed", "disputed"].includes(order.status)) {
    return NextResponse.json(
      { error: `Cannot refund order in status: ${order.status}` },
      { status: 400 }
    );
  }

  const refundAmount = type === "full"
    ? order.total_amount
    : Math.min(amount || 0, order.total_amount);

  if (refundAmount <= 0) {
    return NextResponse.json({ error: "Invalid refund amount" }, { status: 400 });
  }

  // Check for existing payment
  const { data: payment } = await serviceClient
    .from("payment_transactions")
    .select("id, gateway, stripe_payment_intent_id, mobile_money_reference, status")
    .eq("purchase_order_id", order.purchase_order_id)
    .eq("status", "succeeded")
    .limit(1)
    .single();

  let refundReference = "";
  let refundMethod = "platform_wallet";

  // Execute refund based on payment gateway
  if (payment?.gateway === "stripe" && payment.stripe_payment_intent_id) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmount,
        reason: "requested_by_customer",
      });

      refundReference = refund.id;
      refundMethod = "stripe";
    } catch (err) {
      return NextResponse.json(
        { error: `Stripe refund failed: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 500 }
      );
    }
  } else if (payment?.gateway === "mtn_momo" || payment?.gateway === "airtel_money") {
    // Mobile money refunds are typically manual — create a payout record
    refundMethod = payment.gateway;
    refundReference = `REFUND-${Date.now().toString(36).toUpperCase()}`;
  } else {
    refundMethod = "manual";
    refundReference = `MANUAL-${Date.now().toString(36).toUpperCase()}`;
  }

  // Record refund transaction
  await serviceClient.from("payment_transactions").insert({
    purchase_order_id: order.purchase_order_id,
    gateway: refundMethod,
    amount: refundAmount,
    currency: order.currency,
    status: refundMethod === "stripe" ? "refunded" : "processing",
    gateway_transaction_id: refundReference,
    raw_request: { type, reason, originalOrderId: supplierOrderId },
  });

  // Update order status
  const newStatus = type === "full" ? "refunded" : order.status;
  await serviceClient
    .from("supplier_orders")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierOrderId);

  // Log in order history
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  await serviceClient.from("order_status_history").insert({
    supplier_order_id: supplierOrderId,
    old_status: order.status,
    new_status: newStatus,
    changed_by: profile?.id || null,
    note: `Refund ${type}: ${reason}. Amount: ${order.currency} ${(refundAmount / 100).toFixed(2)}. Ref: ${refundReference}`,
  });

  return NextResponse.json({
    success: true,
    refundAmount,
    currency: order.currency,
    refundMethod,
    refundReference,
    type,
  });
}

/**
 * GET /api/refunds — List refunds for the current user's orders
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

  // Get user's purchase orders
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("buyer_user_id", profile.id);

  if (!orders || orders.length === 0) {
    return NextResponse.json({ refunds: [] });
  }

  const orderIds = orders.map((o) => o.id);

  const { data: refunds } = await supabase
    .from("payment_transactions")
    .select("id, gateway, amount, currency, status, gateway_transaction_id, raw_request, created_at")
    .in("purchase_order_id", orderIds)
    .in("status", ["refunded", "processing"])
    .order("created_at", { ascending: false });

  return NextResponse.json({ refunds: refunds || [] });
}
