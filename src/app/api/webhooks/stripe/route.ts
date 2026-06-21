import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripeGateway } from "@/lib/payments";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import { sendOrderConfirmationEmail } from "@/lib/email";

// Stripe is a last-resort gateway. XTransfer (B2B wire) and Flutterwave
// (mobile money) are primary. Post-payment logic — supplier PO, proforma
// invoice, supplier notification — is handled by the pipeline processor
// (order.payment_confirmed). This webhook only updates DB status + sends
// the buyer confirmation email immediately.

/**
 * POST /api/webhooks/stripe — Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const startTime = Date.now();
  let status;
  try {
    status = await stripeGateway.handleWebhook(body, signature);
  } catch (err) {
    console.error("[webhook/stripe] Signature verification failed:", err);
    await logWebhookDelivery({
      webhookType: "stripe",
      eventType: "unknown",
      errorMessage: err instanceof Error ? err.message : "Signature verification failed",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!status.transactionId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Fetch the existing transaction for idempotency + amount validation
  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id, amount")
    .eq("stripe_payment_intent_id", status.transactionId)
    .maybeSingle();

  if (!tx) {
    console.error("[webhook/stripe] No payment_transaction for intent:", status.transactionId);
    return NextResponse.json({ received: true });
  }

  // Idempotency — skip already-terminal transactions
  if (tx.status === "succeeded" || tx.status === "failed") {
    return NextResponse.json({ received: true });
  }

  // Validate webhook amount matches expected amount (Stripe amounts are in minor units)
  const webhookAmount = status.amount;
  if (webhookAmount !== undefined && Math.abs(webhookAmount - (tx.amount as number)) > 1) {
    console.error(`[webhook/stripe] Amount mismatch: expected ${tx.amount}, got ${webhookAmount}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: status.status,
      raw_response: status.rawResponse,
    })
    .eq("stripe_payment_intent_id", status.transactionId);

  // On successful payment, update orders and trigger invoice
  if (status.status === "succeeded") {
    if (tx?.purchase_order_id) {
      // Update order statuses
      await supabase
        .from("purchase_orders")
        .update({ status: "paid" })
        .eq("id", tx.purchase_order_id);

      await supabase
        .from("supplier_orders")
        .update({ status: "paid" })
        .eq("purchase_order_id", tx.purchase_order_id);

      // Buyer confirmation email — send immediately for fast feedback.
      // Supplier PO, proforma invoice, and supplier notification are handled
      // by the pipeline processor (order.payment_confirmed event).
      try {
        const { data: po } = await supabase
          .from("purchase_orders")
          .select("order_number, grand_total, currency, buyer_user_id")
          .eq("id", tx.purchase_order_id)
          .single();

        if (po) {
          const { data: buyer } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("id", po.buyer_user_id)
            .single();

          if (buyer?.email) {
            const amountStr = `${po.currency} ${((po.grand_total as number) / 100).toFixed(2)}`;
            await sendOrderConfirmationEmail(buyer.email, po.order_number, amountStr);
          }
        }
      } catch (err) {
        console.error("[webhook/stripe] Buyer email failed:", err);
      }
    }
  }

  await logWebhookDelivery({
    webhookType: "stripe",
    eventType: status.status ?? "unknown",
    externalEventId: status.transactionId ?? undefined,
    httpStatusCode: 200,
    processingTimeMs: Date.now() - startTime,
    status: "delivered",
  });

  return NextResponse.json({ received: true });
}
