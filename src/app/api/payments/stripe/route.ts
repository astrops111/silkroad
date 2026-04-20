import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripeGateway } from "@/lib/payments";

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

  const result = await stripeGateway.createPayment({
    orderId,
    amount,
    currency,
    paymentMethodId,
    returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/confirmation`,
    description: `Silk Road Africa Order`,
  });

  // Store payment transaction
  await supabase.from("payment_transactions").insert({
    purchase_order_id: orderId,
    gateway: "stripe",
    gateway_transaction_id: result.transactionId,
    stripe_payment_intent_id: result.transactionId,
    amount,
    currency,
    status: result.status,
    raw_response: result.rawResponse,
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
