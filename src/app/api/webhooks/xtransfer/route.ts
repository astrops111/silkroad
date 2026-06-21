import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { xtransferGateway } from "@/lib/payments/gateways/xtransfer";

/**
 * POST /api/webhooks/xtransfer
 *
 * Handles all async callbacks from XTransfer — both directions:
 *
 * 1. COLLECTION (buyer → platform): fired when a buyer's wire transfer lands
 *    in the platform's XTransfer virtual account.
 *    Identified by: payload.collectionId present OR eventType starts with "collection"
 *    Action: update payment_transactions → succeeded, purchase_orders → paid
 *
 * 2. PAYOUT (platform → supplier): fired when a supplier settlement transfer completes.
 *    Identified by: payload.transferId present
 *    Action: update settlements → paid/failed
 *
 * XTransfer sends a POST with JSON body and an X-Sign HMAC-SHA256 header.
 * Both event types use the same XTRANSFER_WEBHOOK_SECRET for signature verification.
 *
 * Register ONE URL in the XTransfer merchant portal:
 *   https://your-domain.com/api/webhooks/xtransfer
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Sign") ?? "";

  // Verify HMAC signature and parse payload
  let result: Awaited<ReturnType<typeof xtransferGateway.handleWebhook>>;
  let rawPayload: {
    eventType?: string;
    requestId?: string;    // Request Money (mobile money)
    collectionId?: string; // Wire collection
    transferId?: string;   // Payout (platform → supplier)
    referenceNo?: string;
    status?: string;
  };
  try {
    rawPayload = JSON.parse(rawBody);
    // rawBody string is passed so HMAC is verified against exact received bytes
    result = await xtransferGateway.handleWebhook(rawBody, signature);
  } catch (err) {
    console.error("[webhooks/xtransfer] Parse/verify failed:", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── Request Money event (African mobile money push — buyer → platform) ────
  const isRequestMoney =
    rawPayload.requestId != null ||
    rawPayload.eventType?.startsWith("request_money");

  if (isRequestMoney) {
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("id, status, purchase_order_id")
      .eq("gateway_transaction_id", rawPayload.requestId ?? "")
      .maybeSingle();

    if (!tx) {
      console.warn("[webhooks/xtransfer] No payment_transaction for requestId", rawPayload.requestId);
      return NextResponse.json({ received: true });
    }

    if (tx.status === "succeeded" || tx.status === "failed") {
      return NextResponse.json({ received: true }); // idempotency
    }

    const now = new Date().toISOString();
    if (result.status === "succeeded") {
      await supabase
        .from("payment_transactions")
        .update({ status: "succeeded", updated_at: now })
        .eq("id", tx.id);
      await supabase
        .from("purchase_orders")
        .update({ status: "paid", updated_at: now })
        .eq("id", tx.purchase_order_id);
      await supabase
        .from("supplier_orders")
        .update({ status: "paid", updated_at: now })
        .eq("purchase_order_id", tx.purchase_order_id);
      console.log("[webhooks/xtransfer] Request Money paid — order:", tx.purchase_order_id, rawPayload.requestId);
    } else if (result.status === "failed") {
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", updated_at: now })
        .eq("id", tx.id);
      console.error("[webhooks/xtransfer] Request Money failed:", rawPayload.requestId);
    }
    return NextResponse.json({ received: true });
  }

  // ── Wire Collection event (buyer → platform via SWIFT) ───────────────────
  const isCollection =
    rawPayload.collectionId != null ||
    rawPayload.eventType?.startsWith("collection");

  if (isCollection) {
    // referenceNo is the unique reference we gave the buyer (e.g. "SILK-ABCDEF1234")
    // It is stored as payment_transactions.gateway_transaction_id
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("id, status, purchase_order_id")
      .eq("gateway_transaction_id", rawPayload.referenceNo ?? "")
      .maybeSingle();

    if (!tx) {
      console.warn("[webhooks/xtransfer] No payment_transaction for collection reference", rawPayload.referenceNo);
      return NextResponse.json({ received: true });
    }

    // Idempotency — skip already-terminal transactions
    if (tx.status === "succeeded" || tx.status === "failed") {
      return NextResponse.json({ received: true });
    }

    if (result.status === "succeeded") {
      const now = new Date().toISOString();

      await supabase
        .from("payment_transactions")
        .update({ status: "succeeded", updated_at: now })
        .eq("id", tx.id);

      await supabase
        .from("purchase_orders")
        .update({ status: "paid", updated_at: now })
        .eq("id", tx.purchase_order_id);

      await supabase
        .from("supplier_orders")
        .update({ status: "paid", updated_at: now })
        .eq("purchase_order_id", tx.purchase_order_id);

      console.log("[webhooks/xtransfer] Collection received — order paid:", tx.purchase_order_id, rawPayload.referenceNo);
    } else if (result.status === "failed") {
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", tx.id);

      console.error("[webhooks/xtransfer] Collection failed:", rawPayload.referenceNo, rawPayload);
    }
    // "processing" — no update, XTransfer will send a terminal callback later

    return NextResponse.json({ received: true });
  }

  // ── Payout event (platform → supplier settlement) ─────────────────────────
  const { data: settlement } = await supabase
    .from("settlements")
    .select("id, status")
    .or(
      [
        rawPayload.transferId ? `xtransfer_transfer_id.eq.${rawPayload.transferId}` : null,
        rawPayload.referenceNo ? `settlement_number.eq.${rawPayload.referenceNo}` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .limit(1)
    .maybeSingle();

  if (!settlement) {
    console.warn("[webhooks/xtransfer] No settlement found for payload", rawPayload);
    return NextResponse.json({ received: true });
  }

  // Idempotency guard
  if (settlement.status === "paid" || settlement.status === "failed") {
    return NextResponse.json({ received: true });
  }

  if (result.status === "succeeded") {
    await supabase
      .from("settlements")
      .update({
        status: "paid",
        payout_method: "xtransfer",
        payout_reference: result.transactionId,
        xtransfer_transfer_id: result.transactionId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", settlement.id);

    console.log("[webhooks/xtransfer] Settlement paid:", settlement.id, result.transactionId);
  } else if (result.status === "failed") {
    await supabase
      .from("settlements")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", settlement.id);

    console.error("[webhooks/xtransfer] Payout failed for settlement:", settlement.id, rawPayload);
  }
  // "processing" — no DB update; XTransfer sends another callback when terminal

  return NextResponse.json({ received: true });
}
