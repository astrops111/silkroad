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
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("purchase_order_id")
      .eq("alipay_trade_no", status.transactionId)
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

  // Alipay expects plain text "success" response
  return new NextResponse("success", { status: 200 });
}
