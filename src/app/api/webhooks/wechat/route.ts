import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { wechatPayGateway } from "@/lib/payments";

/**
 * POST /api/webhooks/wechat — Handle WeChat Pay notification
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // WeChat Pay V3 signature verification (HMAC-SHA256 with API v3 key).
  // Full RSA-SHA256 cert-chain verification should replace this for production.
  const v3Key = process.env.WECHAT_API_V3_KEY;
  if (!v3Key) {
    console.error("[webhook/wechat] WECHAT_API_V3_KEY not configured");
    return NextResponse.json({ code: "FAIL", message: "Misconfigured" }, { status: 500 });
  }
  const timestamp = request.headers.get("wechatpay-timestamp") ?? "";
  const nonce = request.headers.get("wechatpay-nonce") ?? "";
  const signature = request.headers.get("wechatpay-signature") ?? "";
  if (!timestamp || !nonce || !signature) {
    return NextResponse.json({ code: "FAIL", message: "Missing signature headers" }, { status: 401 });
  }

  // H5 — Reject notifications outside a 5-minute window to prevent replay attacks
  const MAX_AGE_SEC = 300;
  const ts = parseInt(timestamp ?? "0", 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_AGE_SEC) {
    return NextResponse.json({ code: "FAIL", message: "Timestamp out of window" }, { status: 401 });
  }
  const { createHmac, timingSafeEqual } = await import("crypto");
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const expected = createHmac("sha256", v3Key).update(message).digest("base64");
  const sigBuf = Buffer.from(signature, "base64");
  const expBuf = Buffer.from(expected, "base64");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    console.error("[webhook/wechat] Signature mismatch");
    return NextResponse.json({ code: "FAIL", message: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ code: "FAIL", message: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  let status;
  try {
    status = await wechatPayGateway.handleWebhook(body);
  } catch (err) {
    console.error("[webhook/wechat] Error:", err);
    return NextResponse.json(
      { code: "FAIL", message: "Processing error" },
      { status: 500 }
    );
  }

  if (!status.transactionId) {
    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  }

  // Fetch the existing transaction for idempotency + amount validation
  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id, amount")
    .eq("wechat_transaction_id", status.transactionId)
    .maybeSingle();

  if (!tx) {
    console.error("[webhook/wechat] No payment_transaction for transactionId:", status.transactionId);
    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  }

  // H4 — Idempotency: skip already-terminal transactions
  if (tx.status === "succeeded" || tx.status === "failed") {
    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  }

  // H1 — Validate webhook amount matches expected amount
  const webhookAmount = status.amount;
  if (webhookAmount !== undefined && Math.abs(webhookAmount - (tx.amount as number)) > 1) {
    console.error(`[webhook/wechat] Amount mismatch: expected ${tx.amount}, got ${webhookAmount}`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: status.status,
      raw_response: status.rawResponse,
    })
    .eq("wechat_transaction_id", status.transactionId);

  // On success, update orders
  if (status.status === "succeeded") {
    if (tx?.purchase_order_id) {
      await supabase
        .from("purchase_orders")
        .update({ status: "paid" })
        .eq("id", tx.purchase_order_id);

      await supabase
        .from("supplier_orders")
        .update({ status: "paid" })
        .eq("purchase_order_id", tx.purchase_order_id);
    }
  }

  // WeChat expects this exact response format
  return NextResponse.json({ code: "SUCCESS", message: "OK" });
}
