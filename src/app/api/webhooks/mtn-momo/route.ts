import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import {
  sendOrderConfirmationEmail,
  sendNewOrderToSupplierEmail,
} from "@/lib/email";
import { sendPaymentConfirmationSMS } from "@/lib/sms";

/**
 * POST /api/webhooks/mtn-momo — Handle MTN MoMo callback
 *
 * Since MTN MoMo callbacks don't include a cryptographic signature,
 * we verify by cross-referencing the reference ID against a known
 * pending transaction in our database before updating any state.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const body = await request.json();
  const supabase = createServiceClient();

  const referenceId = body.externalId || body.financialTransactionId || body.referenceId;
  const isSuccess = body.status === "SUCCESSFUL";

  if (!referenceId) {
    await logWebhookDelivery({
      webhookType: "mtn_momo",
      eventType: body.status ?? "unknown",
      errorMessage: "Missing reference ID",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // Verify the reference ID matches a known pending transaction.
  // This prevents forged callbacks from marking arbitrary orders as paid.
  const { data: existingTx } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id")
    .eq("mobile_money_reference", referenceId)
    .eq("gateway", "mtn_momo")
    .single();

  if (!existingTx) {
    await logWebhookDelivery({
      webhookType: "mtn_momo",
      eventType: body.status ?? "unknown",
      externalEventId: referenceId,
      errorMessage: "Unknown reference ID — no matching pending transaction",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Unknown reference" }, { status: 400 });
  }

  // Reject callbacks for transactions that are already in a terminal state
  if (existingTx.status === "succeeded" || existingTx.status === "refunded") {
    await logWebhookDelivery({
      webhookType: "mtn_momo",
      eventType: body.status ?? "unknown",
      externalEventId: referenceId,
      errorMessage: `Transaction already in terminal state: ${existingTx.status}`,
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Transaction already processed" }, { status: 409 });
  }

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: isSuccess ? "succeeded" : "failed",
      raw_response: body,
    })
    .eq("id", existingTx.id);

  // If success, update orders + send emails
  if (isSuccess && existingTx.purchase_order_id) {
    await supabase
      .from("purchase_orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", existingTx.purchase_order_id);

    await supabase
      .from("supplier_orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("purchase_order_id", existingTx.purchase_order_id);

    // Send SMS confirmation
    const { data: txPhone } = await supabase
      .from("payment_transactions")
      .select("mobile_money_phone, amount, currency")
      .eq("id", existingTx.id)
      .single();

    if (txPhone?.mobile_money_phone) {
      await sendPaymentConfirmationSMS(
        txPhone.mobile_money_phone,
        "",
        ((txPhone.amount as number) / 100).toFixed(2),
        txPhone.currency as string
      );
    }

    // Send email notifications
    const { data: order } = await supabase
      .from("purchase_orders")
      .select("order_number, grand_total, currency, buyer_user_id, supplier_orders (supplier_id)")
      .eq("id", existingTx.purchase_order_id)
      .single();

    if (order) {
      const { data: buyer } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", order.buyer_user_id)
        .single();

      const amountStr = `${order.currency} ${((order.grand_total as number) / 100).toFixed(2)}`;

      if (buyer?.email) {
        await sendOrderConfirmationEmail(buyer.email, order.order_number, amountStr);
      }

      // Notify suppliers
      for (const so of (order.supplier_orders as Array<{ supplier_id: string }>) || []) {
        const { data: sm } = await supabase
          .from("company_members")
          .select("user_profiles (email)")
          .eq("company_id", so.supplier_id)
          .eq("is_primary", true)
          .limit(1)
          .single();
        const email = (sm?.user_profiles as unknown as { email: string })?.email;
        if (email) {
          await sendNewOrderToSupplierEmail(email, order.order_number, "Buyer", amountStr);
        }
      }
    }
  }

  await logWebhookDelivery({
    webhookType: "mtn_momo",
    eventType: isSuccess ? "payment_succeeded" : "payment_failed",
    externalEventId: referenceId,
    httpStatusCode: 200,
    processingTimeMs: Date.now() - startTime,
    status: "delivered",
  });

  return NextResponse.json({ received: true });
}
