import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { flutterwaveGateway } from "@/lib/payments/gateways/flutterwave";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import { sendOrderConfirmationEmail } from "@/lib/email";

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
  if (!event?.startsWith("charge.")) {
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
    .select("id, status, purchase_order_id")
    .eq("gateway_transaction_id", txRef)
    .maybeSingle();

  if (txErr || !tx) {
    console.error("[webhooks/flutterwave] No payment_transaction for tx_ref:", txRef, txErr?.message);
    return NextResponse.json({ received: true }); // 200 stops Flutterwave retrying
  }

  if (tx.status === "succeeded" || tx.status === "failed") {
    return NextResponse.json({ received: true }); // idempotency
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

  await supabase
    .from("purchase_orders")
    .update({ status: "paid", updated_at: now })
    .eq("id", tx.purchase_order_id);

  // DB trigger fires on this update → enqueues order.payment_confirmed
  await supabase
    .from("supplier_orders")
    .update({ status: "paid", updated_at: now })
    .eq("purchase_order_id", tx.purchase_order_id);

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
