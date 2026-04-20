import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { tigoCashGateway } from "@/lib/payments";

/**
 * POST /api/webhooks/tigo — Handle Tigo Cash callback
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
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
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("purchase_order_id")
      .eq("gateway_transaction_id", status.transactionId)
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

      // Trigger email notifications
      const { onOrderPaid } = await import("@/lib/email/events");
      await onOrderPaid(tx.purchase_order_id).catch((err) =>
        console.error("[webhook/tigo] Email failed:", err)
      );
    }
  }

  return NextResponse.json({ received: true });
}
