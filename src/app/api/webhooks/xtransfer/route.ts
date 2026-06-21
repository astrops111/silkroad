import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { xtransferGateway } from "@/lib/payments/gateways/xtransfer";

/**
 * POST /api/webhooks/xtransfer
 *
 * Handles async payout status callbacks from XTransfer.
 *
 * XTransfer sends a POST with JSON body and an X-Sign header.
 * We verify the HMAC signature (XTRANSFER_WEBHOOK_SECRET), then
 * update the settlement record based on the payout status.
 *
 * Expected payload shape:
 *   {
 *     transferId:  string   — XTransfer's payout ID
 *     referenceNo: string   — our settlement_number (idempotency key we sent)
 *     status:      "SUCCESS" | "FAILED" | "PROCESSING" | "CANCELLED"
 *     amount:      number
 *     currency:    string
 *     timestamp:   string
 *   }
 *
 * Register this URL in the XTransfer merchant portal:
 *   https://your-domain.com/api/webhooks/xtransfer
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Sign") ?? "";

  // Verify signature and parse payload
  let result: Awaited<ReturnType<typeof xtransferGateway.handleWebhook>>;
  let rawPayload: { transferId?: string; referenceNo?: string };
  try {
    rawPayload = JSON.parse(rawBody);
    result = await xtransferGateway.handleWebhook(rawPayload, signature);
  } catch (err) {
    console.error("[webhooks/xtransfer] Parse/verify failed:", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find settlement by XTransfer transfer ID OR our settlement_number (referenceNo)
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
    // Return 200 so XTransfer stops retrying for unknown events
    console.warn("[webhooks/xtransfer] No settlement found for payload", rawPayload);
    return NextResponse.json({ received: true });
  }

  // Ignore callbacks on already-terminal settlements (idempotency guard)
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
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", settlement.id);

    console.error("[webhooks/xtransfer] Payout failed for settlement:", settlement.id, rawPayload);
  }
  // "processing" status — no DB update, XTransfer will send another callback when terminal

  return NextResponse.json({ received: true });
}
