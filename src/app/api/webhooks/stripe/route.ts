import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripeGateway } from "@/lib/payments";
import { issueInvoice } from "@/lib/invoice";
import { logWebhookDelivery } from "@/lib/logging/webhook";
import {
  sendOrderConfirmationEmail,
  sendNewOrderToSupplierEmail,
} from "@/lib/email";

/**
 * POST /api/webhooks/stripe — Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const startTime = Date.now();
  let status;
  try {
    status = await stripeGateway.handleWebhook(body, signature);
  } catch (err) {
    console.error("[webhook/stripe] Signature verification failed:", err);
    await logWebhookDelivery({
      webhookType: "stripe",
      eventType: "unknown",
      errorMessage: err instanceof Error ? err.message : "Signature verification failed",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!status.transactionId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Update payment transaction
  await supabase
    .from("payment_transactions")
    .update({
      status: status.status,
      raw_response: status.rawResponse,
    })
    .eq("stripe_payment_intent_id", status.transactionId);

  // On successful payment, update orders and trigger invoice
  if (status.status === "succeeded") {
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("purchase_order_id")
      .eq("stripe_payment_intent_id", status.transactionId)
      .single();

    if (tx?.purchase_order_id) {
      // Update order statuses
      await supabase
        .from("purchase_orders")
        .update({ status: "paid" })
        .eq("id", tx.purchase_order_id);

      await supabase
        .from("supplier_orders")
        .update({ status: "paid" })
        .eq("purchase_order_id", tx.purchase_order_id);

      // Send buyer confirmation email
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("order_number, grand_total, currency, buyer_user_id, buyer_company_name")
        .eq("id", tx.purchase_order_id)
        .single();

      if (po) {
        const { data: buyer } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("id", po.buyer_user_id)
          .single();

        const amountStr = `${po.currency} ${((po.grand_total as number) / 100).toFixed(2)}`;
        if (buyer?.email) {
          await sendOrderConfirmationEmail(buyer.email, po.order_number, amountStr);
        }
      }

      // Trigger invoice generation + supplier notifications for each supplier order
      const { data: supplierOrders } = await supabase
        .from("supplier_orders")
        .select("id, supplier_id, subtotal, tax_amount, total_amount, currency, order_number")
        .eq("purchase_order_id", tx.purchase_order_id);

      if (supplierOrders) {
        for (const so of supplierOrders) {
          // Get supplier info
          const { data: supplier } = await supabase
            .from("companies")
            .select("name, tax_id, country_code, address")
            .eq("id", so.supplier_id)
            .single();

          // Get buyer info from purchase order
          const { data: po } = await supabase
            .from("purchase_orders")
            .select("buyer_company_name, buyer_tax_id, buyer_company_id")
            .eq("id", tx.purchase_order_id)
            .single();

          if (supplier) {
            // Email supplier about new order
            const { data: supplierMember } = await supabase
              .from("company_members")
              .select("user_profiles (email)")
              .eq("company_id", so.supplier_id)
              .eq("is_primary", true)
              .limit(1)
              .single();

            const supplierEmail = (supplierMember?.user_profiles as unknown as { email: string })?.email;
            if (supplierEmail && po) {
              const amountStr = `${so.currency} ${(so.total_amount / 100).toFixed(2)}`;
              await sendNewOrderToSupplierEmail(
                supplierEmail,
                so.order_number,
                po.buyer_company_name || "Buyer",
                amountStr
              );
            }

            try {
              await issueInvoice({
                invoiceType: "b2b_standard",
                invoiceDate: new Date().toISOString().slice(0, 10),
                issuerCompanyId: so.supplier_id,
                issuerName: supplier.name,
                issuerTaxId: supplier.tax_id || undefined,
                issuerAddress: supplier.address || undefined,
                issuerCountry: supplier.country_code,
                recipientCompanyId: po?.buyer_company_id || undefined,
                recipientName: po?.buyer_company_name || "Buyer",
                recipientTaxId: po?.buyer_tax_id || undefined,
                recipientCountry: supplier.country_code, // TODO: get from buyer profile
                subtotal: so.subtotal,
                taxRate: so.tax_amount / so.subtotal || 0,
                taxAmount: so.tax_amount,
                totalAmount: so.total_amount,
                currency: so.currency,
                taxType: "taxable",
                lineItems: [], // TODO: fetch from supplier_order_items
                supplierOrderId: so.id,
                purchaseOrderId: tx.purchase_order_id,
                orderNumber: so.order_number,
              });
            } catch (err) {
              console.error(`[webhook/stripe] Invoice generation failed for SO ${so.id}:`, err);
            }
          }
        }
      }
    }
  }

  await logWebhookDelivery({
    webhookType: "stripe",
    eventType: status.status ?? "unknown",
    externalEventId: status.transactionId ?? undefined,
    httpStatusCode: 200,
    processingTimeMs: Date.now() - startTime,
    status: "delivered",
  });

  return NextResponse.json({ received: true });
}
