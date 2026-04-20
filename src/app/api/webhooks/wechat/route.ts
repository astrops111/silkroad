import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { wechatPayGateway } from "@/lib/payments";

/**
 * POST /api/webhooks/wechat — Handle WeChat Pay notification
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
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
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("purchase_order_id")
      .eq("wechat_transaction_id", status.transactionId)
      .single();

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
