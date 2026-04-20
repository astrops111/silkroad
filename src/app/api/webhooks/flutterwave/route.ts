import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flutterwaveGateway } from "@/lib/payments/gateways/flutterwave";

// Flutterwave sends webhooks with a secret hash for verification
const FLW_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH;

export async function POST(req: NextRequest) {
  // ── Signature verification ──────────────────────────────────────────────
  const signature = req.headers.get("verif-hash");
  if (!FLW_HASH || signature !== FLW_HASH) {
    console.error("[flutterwave/webhook] Invalid or missing verif-hash");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse payload ───────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string;
  console.log(`[flutterwave/webhook] event=${event}`);

  // Only handle charge events
  if (!event?.startsWith("charge.")) {
    return NextResponse.json({ received: true });
  }

  // ── Parse payment result ────────────────────────────────────────────────
  const result = await flutterwaveGateway.handleWebhook(payload);
  const txRef = result.transactionId;

  if (!txRef) {
    console.error("[flutterwave/webhook] No tx_ref in payload");
    return NextResponse.json({ received: true });
  }

  const supabase = await createClient();

  // ── Find matching payment record ────────────────────────────────────────
  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select("id, order_id, status")
    .eq("provider_ref", txRef)
    .single();

  if (fetchErr || !payment) {
    console.error("[flutterwave/webhook] Payment not found for tx_ref:", txRef);
    // Return 200 to prevent Flutterwave from retrying endlessly
    return NextResponse.json({ received: true });
  }

  // Idempotency — don't re-process already succeeded payments
  if (payment.status === "succeeded") {
    return NextResponse.json({ received: true });
  }

  // ── Update payment status ───────────────────────────────────────────────
  const dbStatus = result.status; // 'succeeded' | 'failed' | 'pending'

  const { error: updateErr } = await supabase
    .from("payments")
    .update({
      status: dbStatus,
      amount: result.amount,
      currency: result.currency,
      settled_at: result.paidAt?.toISOString() ?? null,
    })
    .eq("id", payment.id);

  if (updateErr) {
    console.error("[flutterwave/webhook] Failed to update payment:", updateErr);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  // ── Update order status when payment succeeds ───────────────────────────
  if (dbStatus === "succeeded") {
    const { error: orderErr } = await supabase
      .from("orders")
      .update({ status: "confirmed", payment_status: "paid" })
      .eq("id", payment.order_id);

    if (orderErr) {
      console.error("[flutterwave/webhook] Failed to update order:", orderErr);
    } else {
      console.log(
        `[flutterwave/webhook] Order ${payment.order_id} confirmed — payment ${txRef}`
      );
    }
  }

  return NextResponse.json({ received: true });
}
