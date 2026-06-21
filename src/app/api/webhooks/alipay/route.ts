import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { alipayGateway } from "@/lib/payments";

/**
 * POST /api/webhooks/alipay — Handle Alipay async notification
 * Alipay sends form-urlencoded POST
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const supabase = createServiceClient();

  let status;
  try {
    status = await alipayGateway.handleWebhook(params);
  } catch (err) {
    console.error("[webhook/alipay] Error:", err);
    return new NextResponse("fail", { status: 200 });
  }

  if (!status.transactionId) {
    return new NextResponse("success", { status: 200 });
  }

  // Fetch the existing transaction for idempotency + amount validation
  const { data: tx } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id, amount")
    .eq("alipay_trade_no", status.transactionId)
    .maybeSingle();

  if (!tx) {
    console.error("[webhook/alipay] No payment_transaction for trade no:", status.transactionId);
    return new NextResponse("success", { status: 200 }); // Alipay expects "success" to stop retries
  }

  // Idempotency — skip already-terminal transactions
  if (tx.status === "succeeded" || tx.status === "failed") {
    return new NextResponse("success", { status: 200 });
  }

  // Validate webhook amount matches expected amount (Alipay total_amount converted to minor units)
  const webhookAmount = status.amount;
  if (webhookAmount !== undefined && Math.abs(webhookAmount - (tx.amount as number)) > 1) {
    console.error(`[webhook/alipay] Amount mismatch: expected ${tx.amount}, got ${webhookAmount}`);
    return new NextResponse("fail", { status: 200 }); // Alipay uses plain text responses
  }

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: status.status,
      raw_response: status.rawResponse,
    })
    .eq("alipay_trade_no", status.transactionId);

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

  // Alipay expects plain text "success" response
  return new NextResponse("success", { status: 200 });
}
