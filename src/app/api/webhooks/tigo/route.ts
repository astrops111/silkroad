import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { tigoCashGateway } from "@/lib/payments";
import { handleGatewayRefund, sumSucceededPaymentAmount } from "@/lib/payments/webhook-events";
import { resolveOrderStatusAfterSuccess } from "@/lib/payments/deposit";

/**
 * POST /api/webhooks/tigo — Handle Tigo Cash callback
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // HMAC-SHA256 signature verification using shared webhook secret
  const secret = process.env.TIGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/tigo] TIGO_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }
  const signature = request.headers.get("x-tigo-signature") ?? "";
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }
  const { createHmac, timingSafeEqual } = await import("crypto");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    console.error("[webhook/tigo] Signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  let status;
  try {
    status = await tigoCashGateway.handleWebhook(body);
  } catch (err) {
    console.error("[webhook/tigo] Error:", err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  if (!status.transactionId) {
    return NextResponse.json({ received: true });
  }

  // Fetch the existing transaction for idempotency check
  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id, amount")
    .eq("gateway_transaction_id", status.transactionId)
    .maybeSingle();

  if (!tx) {
    console.error("[webhook/tigo] No payment_transaction for transactionId:", status.transactionId);
    return NextResponse.json({ received: true });
  }

  // A reversal can arrive for an already "succeeded" transaction — must run
  // BEFORE the H4 idempotency skip below.
  if (status.status === "refunded" && tx.purchase_order_id) {
    await handleGatewayRefund(supabase, {
      gateway: "tigo_cash",
      txId: tx.id,
      purchaseOrderId: tx.purchase_order_id,
      rawEvent: status.rawResponse,
    });
    return NextResponse.json({ received: true });
  }

  // H4 — Idempotency: skip already-terminal transactions
  if (tx.status === "succeeded" || tx.status === "failed") {
    return NextResponse.json({ received: true });
  }

  // TODO(H1): Tigo Cash callbacks do not reliably include an amount field,
  // so amount validation cannot be performed here without an additional API poll.
  // Consider calling the Tigo transaction status API to verify the amount
  // matches tx.amount before marking the order as paid.

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: status.status,
      raw_response: status.rawResponse,
    })
    .eq("gateway_transaction_id", status.transactionId);

  // On success, update orders
  if (status.status === "succeeded") {
    if (tx?.purchase_order_id) {
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("grand_total")
        .eq("id", tx.purchase_order_id)
        .single();
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
        await supabase.from("payment_transactions").update({ deposit_paid_at: new Date().toISOString() }).eq("id", tx.id);
      }

      // Trigger email notifications
      const { onOrderPaid } = await import("@/lib/email/events");
      await onOrderPaid(tx.purchase_order_id).catch((err) =>
        console.error("[webhook/tigo] Email failed:", err)
      );
    }
  }

  return NextResponse.json({ received: true });
}
