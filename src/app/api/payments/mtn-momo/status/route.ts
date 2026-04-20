import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mtnMomoGateway } from "@/lib/payments";

/**
 * GET /api/payments/mtn-momo/status?transactionId=xxx
 * Poll for MTN MoMo payment status (mobile money is async)
 */
export async function GET(request: NextRequest) {
  const transactionId = request.nextUrl.searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
  }

  const status = await mtnMomoGateway.checkStatus(transactionId);
  const supabase = await createClient();

  // Update transaction in database
  if (status.status === "succeeded" || status.status === "failed") {
    await supabase
      .from("payment_transactions")
      .update({
        status: status.status,
        raw_response: status.rawResponse,
      })
      .eq("gateway_transaction_id", transactionId);

    // If succeeded, update order status
    if (status.status === "succeeded") {
      const { data: tx } = await supabase
        .from("payment_transactions")
        .select("purchase_order_id")
        .eq("gateway_transaction_id", transactionId)
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
  }

  return NextResponse.json({
    transactionId: status.transactionId,
    status: status.status,
    amount: status.amount,
    currency: status.currency,
    paidAt: status.paidAt,
  });
}
