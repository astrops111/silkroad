import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import {
  sendOrderConfirmationEmail,
  sendNewOrderToSupplierEmail,
} from "@/lib/email";
import { sendPaymentConfirmationSMS } from "@/lib/sms";

/**
 * POST /api/webhooks/airtel — Handle Airtel Money payment callback
 *
 * Airtel Money callbacks include a transaction reference and status.
 * We verify by matching against a known pending transaction in our database.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const body = await request.json();
  const supabase = createServiceClient();

  // Airtel callback structure varies by country API version
  const transactionId =
    body.transaction?.id ||
    body.transactionId ||
    body.reference ||
    body.externalId;

  const isSuccess =
    body.transaction?.status === "TS" || // TS = Transaction Successful
    body.status === "SUCCESS" ||
    body.status === "SUCCESSFUL";

  if (!transactionId) {
    await logWebhookDelivery({
      webhookType: "airtel_money",
      eventType: body.status ?? "unknown",
      errorMessage: "Missing transaction reference",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // Verify the reference matches a known pending transaction
  const { data: existingTx } = await supabase
    .from("payment_transactions")
    .select("id, status, purchase_order_id, amount, currency")
    .eq("mobile_money_reference", transactionId)
    .eq("gateway", "airtel_money")
    .single();

  if (!existingTx) {
    await logWebhookDelivery({
      webhookType: "airtel_money",
      eventType: body.status ?? "unknown",
      externalEventId: transactionId,
      errorMessage: "Unknown transaction reference — no matching pending transaction",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Unknown reference" }, { status: 400 });
  }

  // Reject callbacks for transactions already in a terminal state
  if (existingTx.status === "succeeded" || existingTx.status === "refunded") {
    await logWebhookDelivery({
      webhookType: "airtel_money",
      eventType: body.status ?? "unknown",
      externalEventId: transactionId,
      errorMessage: `Transaction already in terminal state: ${existingTx.status}`,
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json(
      { error: "Transaction already processed" },
      { status: 409 }
    );
  }

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: isSuccess ? "succeeded" : "failed",
      raw_response: body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingTx.id);

  // On success: update orders + send emails + trigger settlement
  if (isSuccess && existingTx.purchase_order_id) {
    // Update order statuses
    await supabase
      .from("purchase_orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", existingTx.purchase_order_id);

    await supabase
      .from("supplier_orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("purchase_order_id", existingTx.purchase_order_id);

    // Send SMS confirmation to the mobile money phone
    const { data: txDetails } = await supabase
      .from("payment_transactions")
      .select("mobile_money_phone, amount, currency")
      .eq("id", existingTx.id)
      .single();

    if (txDetails?.mobile_money_phone) {
      await sendPaymentConfirmationSMS(
        txDetails.mobile_money_phone,
        "", // order number filled below
        ((txDetails.amount as number) / 100).toFixed(2),
        txDetails.currency as string
      );
    }

    // Fetch order details for email notifications
    const { data: order } = await supabase
      .from("purchase_orders")
      .select(`
        order_number, grand_total, currency,
        buyer_user_id,
        supplier_orders (
          id, supplier_id,
          companies:supplier_id (name)
        )
      `)
      .eq("id", existingTx.purchase_order_id)
      .single();

    if (order) {
      // Get buyer email
      const { data: buyer } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", order.buyer_user_id)
        .single();

      const amountStr = `${order.currency} ${((order.grand_total as number) / 100).toFixed(2)}`;

      // Send buyer confirmation
      if (buyer?.email) {
        await sendOrderConfirmationEmail(buyer.email, order.order_number, amountStr);
      }

      // Notify each supplier
      for (const so of (order.supplier_orders as Array<Record<string, unknown>>) || []) {
        const supplierCompany = so.companies as { name: string } | null;
        // Get supplier owner email
        const { data: supplierMember } = await supabase
          .from("company_members")
          .select("user_profiles (email)")
          .eq("company_id", so.supplier_id as string)
          .eq("is_primary", true)
          .limit(1)
          .single();

        const supplierEmail = (supplierMember?.user_profiles as unknown as { email: string })?.email;
        if (supplierEmail) {
          await sendNewOrderToSupplierEmail(
            supplierEmail,
            order.order_number,
            "Buyer",
            amountStr
          );
        }
      }
    }
  }

  await logWebhookDelivery({
    webhookType: "airtel_money",
    eventType: isSuccess ? "payment_succeeded" : "payment_failed",
    externalEventId: transactionId,
    httpStatusCode: 200,
    processingTimeMs: Date.now() - startTime,
    status: "delivered",
  });

  return NextResponse.json({ received: true });
}
