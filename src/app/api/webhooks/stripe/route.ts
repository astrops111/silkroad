import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripeGateway } from "@/lib/payments";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { handleGatewayRefund, handleGatewayDispute, sumSucceededPaymentAmount } from "@/lib/payments/webhook-events";
import { resolveOrderStatusAfterSuccess } from "@/lib/payments/deposit";

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

  // Refund/dispute events can arrive for a transaction that's already
  // "succeeded" — these must run BEFORE the succeeded/failed idempotency
  // skip below, which only guards the original payment-creation path.
  if (status.status === "refunded" && tx.purchase_order_id) {
    await handleGatewayRefund(supabase, {
      gateway: "stripe",
      txId: tx.id,
      purchaseOrderId: tx.purchase_order_id,
      rawEvent: status.rawResponse,
    });
    await logWebhookDelivery({
      webhookType: "stripe",
      eventType: status.eventType ?? "charge.refunded",
      externalEventId: status.transactionId,
      httpStatusCode: 200,
      processingTimeMs: Date.now() - startTime,
      status: "delivered",
    });
    return NextResponse.json({ received: true });
  }

  if (status.status === "disputed" && tx.purchase_order_id && status.gatewayDisputeId) {
    await handleGatewayDispute(supabase, {
      gateway: "stripe",
      purchaseOrderId: tx.purchase_order_id,
      gatewayDisputeId: status.gatewayDisputeId,
      amount: status.amount,
      currency: status.currency,
      reason: status.disputeReason,
    });
    await logWebhookDelivery({
      webhookType: "stripe",
      eventType: status.eventType ?? "charge.dispute.created",
      externalEventId: status.gatewayDisputeId,
      httpStatusCode: 200,
      processingTimeMs: Date.now() - startTime,
      status: "delivered",
    });
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
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("order_number, grand_total, currency, buyer_user_id")
        .eq("id", tx.purchase_order_id)
        .single();

      // Deposit-aware: a deposit leg lands on "deposit_paid", not "paid" —
      // resolveOrderStatusAfterSuccess compares cumulative succeeded amount
      // (this transaction's status was just updated above) against grand_total.
      const totalSucceeded = po ? await sumSucceededPaymentAmount(supabase, tx.purchase_order_id) : (tx.amount as number);
      const nextStatus = po ? resolveOrderStatusAfterSuccess(totalSucceeded, po.grand_total as number) : "paid";

      await supabase
        .from("purchase_orders")
        .update({ status: nextStatus })
        .eq("id", tx.purchase_order_id);

      await supabase
        .from("supplier_orders")
        .update({ status: nextStatus })
        .eq("purchase_order_id", tx.purchase_order_id);

      if (nextStatus === "deposit_paid") {
        await supabase
          .from("payment_transactions")
          .update({ deposit_paid_at: new Date().toISOString() })
          .eq("id", tx.id);
      }

      // Buyer confirmation email — send immediately for fast feedback.
      // Supplier PO, proforma invoice, and supplier notification are handled
      // by the pipeline processor (order.payment_confirmed event).
      try {
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
