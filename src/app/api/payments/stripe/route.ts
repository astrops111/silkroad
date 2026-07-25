import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripeGateway } from "@/lib/payments";
import { resolveChargeAmount } from "@/lib/payments/deposit";
import { sumSucceededPaymentAmount } from "@/lib/payments/webhook-events";

/**
 * POST /api/payments/stripe — Create a Stripe payment intent
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, amount, currency, paymentMethodId, returnUrl } = await request.json();

  if (!orderId || !amount || !currency) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, status, grand_total, metadata")
    .eq("id", orderId)
    .eq("buyer_user_id", profile.id)
    .single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment" && order.status !== "deposit_paid")
    return NextResponse.json({ error: "Order is not awaiting payment" }, { status: 400 });

  // Deposit-aware: chargeAmount is the deposit on the first call, the
  // remaining balance on the second (once the deposit has landed), or the
  // full grand_total for a plain immediate order.
  const priorSucceeded = await sumSucceededPaymentAmount(supabase, orderId);
  const { chargeAmount, leg } = resolveChargeAmount(order, priorSucceeded);

  // H2: validate client-supplied amount against DB source of truth
  const requestAmount = Number(amount);
  if (Math.abs(requestAmount - chargeAmount) > 1) {
    return NextResponse.json({ error: "Amount does not match order total" }, { status: 400 });
  }

  const result = await stripeGateway.createPayment({
    orderId,
    amount: chargeAmount,
    currency,
    paymentMethodId,
    returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${orderId}`,
    description: `Silk Road Africa Order`,
  });

  // Store payment transaction
  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "stripe",
    gateway_transaction_id: result.transactionId,
    stripe_payment_intent_id: result.transactionId,
    amount: chargeAmount,
    currency,
    status: result.status,
    raw_response: result.rawResponse,
    payment_terms: leg === "deposit" || leg === "balance" ? "deposit_balance" : "immediate",
    deposit_amount: leg === "deposit" ? chargeAmount : null,
  });

  return NextResponse.json({
    success: result.success,
    clientSecret: (result.rawResponse as { client_secret?: string })?.client_secret,
    transactionId: result.transactionId,
    status: result.status,
    requiresAction: result.requiresAction,
    actionUrl: result.actionUrl,
  });
}
