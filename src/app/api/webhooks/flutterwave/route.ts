import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { flutterwaveGateway } from "@/lib/payments/gateways/flutterwave";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { handleGatewayRefund, handleGatewayDispute, sumSucceededPaymentAmount } from "@/lib/payments/webhook-events";
import { resolveOrderStatusAfterSuccess } from "@/lib/payments/deposit";

const FLW_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH;

/**
 * POST /api/webhooks/flutterwave
 *
 * Handles charge.completed / charge.failed events.
 * Flutterwave is the primary mobile money gateway for African buyers
 * (GH, KE, TZ, UG, RW, ZM and other markets). XTransfer is primary
 * for cross-border wire; this is the mobile fallback.
 *
 * On success:
 *   payment_transactions → succeeded
 *   purchase_orders      → paid
 *   supplier_orders      → paid  ← DB trigger enqueues order.payment_confirmed
 *   Buyer confirmation email sent immediately.
 *
 * Supplier PO, proforma invoice, and supplier notification are handled
 * by the pipeline processor (order.payment_confirmed handler).
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── Signature verification ────────────────────────────────────────────────
  const signature = req.headers.get("verif-hash");
  if (!FLW_HASH) {
    console.error("[webhooks/flutterwave] FLUTTERWAVE_WEBHOOK_HASH not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { timingSafeEqual } = await import("crypto");
  const sigBuf = Buffer.from(signature);
  const hashBuf = Buffer.from(FLW_HASH);
  if (sigBuf.length !== hashBuf.length || !timingSafeEqual(sigBuf, hashBuf)) {
    console.error("[webhooks/flutterwave] Invalid verif-hash");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string;
  if (!event?.startsWith("charge.") && !event?.startsWith("chargeback.")) {
    return NextResponse.json({ received: true });
  }

  // ── Parse result ──────────────────────────────────────────────────────────
  const result = await flutterwaveGateway.handleWebhook(payload);
  const txRef = result.transactionId; // "silk-{orderId}-{timestamp}" from createPayment

  if (!txRef) {
    console.error("[webhooks/flutterwave] No tx_ref in payload");
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // ── Find payment transaction ──────────────────────────────────────────────
  const { data: tx, error: txErr } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id, amount")
    .eq("gateway_transaction_id", txRef)
    .maybeSingle();

  if (txErr || !tx) {
    console.error("[webhooks/flutterwave] No payment_transaction for tx_ref:", txRef, txErr?.message);
    return NextResponse.json({ received: true }); // 200 stops Flutterwave retrying
  }

  // Refund/chargeback events can arrive for a transaction that's already
  // "succeeded" — these must run BEFORE the succeeded/failed idempotency
  // skip below, which only guards the original payment-creation path.
  if (result.status === "refunded" && tx.purchase_order_id) {
    await handleGatewayRefund(supabase, {
      gateway: "flutterwave",
      txId: tx.id,
      purchaseOrderId: tx.purchase_order_id,
      rawEvent: result.rawResponse,
    });
    await logWebhookDelivery({
      webhookType: "flutterwave",
      eventType: result.eventType ?? event,
      externalEventId: txRef,
      httpStatusCode: 200,
      processingTimeMs: Date.now() - startTime,
      status: "delivered",
    });
    return NextResponse.json({ received: true });
  }

  if (result.status === "disputed" && tx.purchase_order_id && result.gatewayDisputeId) {
    await handleGatewayDispute(supabase, {
      gateway: "flutterwave",
      purchaseOrderId: tx.purchase_order_id,
      gatewayDisputeId: result.gatewayDisputeId,
      amount: result.amount,
      currency: result.currency,
      reason: result.disputeReason,
    });
    await logWebhookDelivery({
      webhookType: "flutterwave",
      eventType: result.eventType ?? event,
      externalEventId: result.gatewayDisputeId,
      httpStatusCode: 200,
      processingTimeMs: Date.now() - startTime,
      status: "delivered",
    });
    return NextResponse.json({ received: true });
  }

  if (tx.status === "succeeded" || tx.status === "failed") {
    return NextResponse.json({ received: true }); // idempotency
  }

  // Validate webhook amount matches expected amount
  const webhookAmount = result.amount;
  if (webhookAmount !== undefined && Math.abs(webhookAmount - (tx.amount as number)) > 1) {
    console.error(`[webhooks/flutterwave] Amount mismatch: expected ${tx.amount}, got ${webhookAmount}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // H6 — Re-verify with Flutterwave API before marking order paid.
  // The HMAC check above only proves the notification came from Flutterwave;
  // this second call confirms the actual transaction state via their REST API.
  if (result.status === "succeeded") {
    let apiVerified: Awaited<ReturnType<typeof flutterwaveGateway.checkStatus>>;
    try {
      apiVerified = await flutterwaveGateway.checkStatus(txRef);
    } catch (verifyErr) {
      console.error("[webhooks/flutterwave] API re-verification failed:", verifyErr);
      return NextResponse.json({ received: true }); // don't mark paid; retry on next webhook
    }
    if (apiVerified.status !== "succeeded") {
      console.error("[webhooks/flutterwave] API re-verification did not confirm success:", apiVerified.status, txRef);
      return NextResponse.json({ received: true });
    }
  }

  await logWebhookDelivery({
    webhookType: "flutterwave",
    eventType: event,
    externalEventId: txRef,
    httpStatusCode: 200,
    processingTimeMs: Date.now() - startTime,
    status: "delivered",
  });

  const now = new Date().toISOString();

  if (result.status === "failed") {
    await supabase
      .from("payment_transactions")
      .update({ status: "failed", updated_at: now, raw_response: result.rawResponse as object })
      .eq("id", tx.id);
    console.error("[webhooks/flutterwave] Payment failed:", txRef);
    return NextResponse.json({ received: true });
  }

  if (result.status !== "succeeded") {
    // Pending — Flutterwave will send a terminal event when complete
    return NextResponse.json({ received: true });
  }

  // ── Payment succeeded — update all three tables ───────────────────────────
  await supabase
    .from("payment_transactions")
    .update({ status: "succeeded", updated_at: now, raw_response: result.rawResponse as object })
    .eq("id", tx.id);

  const { data: poForStatus } = await supabase
    .from("purchase_orders")
    .select("grand_total")
    .eq("id", tx.purchase_order_id)
    .single();
  const totalSucceeded = poForStatus ? await sumSucceededPaymentAmount(supabase, tx.purchase_order_id) : (tx.amount as number);
  const nextStatus = poForStatus ? resolveOrderStatusAfterSuccess(totalSucceeded, poForStatus.grand_total as number) : "paid";

  await supabase
    .from("purchase_orders")
    .update({ status: nextStatus, updated_at: now })
    .eq("id", tx.purchase_order_id);

  // DB trigger fires on this update → enqueues order.payment_confirmed
  // for both "paid" and "deposit_paid" (see 00121_pipeline_deposit_paid_trigger.sql)
  await supabase
    .from("supplier_orders")
    .update({ status: nextStatus, updated_at: now })
    .eq("purchase_order_id", tx.purchase_order_id);

  if (nextStatus === "deposit_paid") {
    await supabase.from("payment_transactions").update({ deposit_paid_at: now }).eq("id", tx.id);
  }

  console.log("[webhooks/flutterwave] Order paid:", tx.purchase_order_id, txRef);

  // ── Buyer confirmation email — immediate feedback, not via pipeline ────────
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
    // Non-fatal — pipeline can send a follow-up if needed
    console.error("[webhooks/flutterwave] Buyer email failed:", err);
  }

  return NextResponse.json({ received: true });
}
