import { createServiceClient } from "@/lib/supabase/server";
import {
  sendOrderConfirmationEmail,
  sendNewOrderToSupplierEmail,
  sendOrderStatusUpdateEmail,
  sendEmail,
} from "./index";
import { formatMoney } from "@/lib/payments/currency-config";

/**
 * Email event dispatcher — call these from webhooks, API routes, and triggers
 * Each function looks up the recipient email from Supabase and sends
 */

/**
 * Order placed — notify buyer + supplier(s)
 */
export async function onOrderPaid(purchaseOrderId: string) {
  const supabase = createServiceClient();

  // Get purchase order + buyer
  const { data: po } = await supabase
    .from("purchase_orders")
    .select(`
      order_number, grand_total, currency, buyer_company_name,
      buyer_user_id,
      user_profiles!purchase_orders_buyer_user_id_fkey ( email, full_name )
    `)
    .eq("id", purchaseOrderId)
    .single();

  if (!po) return;

  const buyer = po.user_profiles as unknown as { email: string; full_name: string } | null;
  const total = formatMoney(po.grand_total, po.currency);

  // Email buyer
  if (buyer?.email) {
    await sendOrderConfirmationEmail(buyer.email, po.order_number, total);
  }

  // Email each supplier
  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("supplier_id, order_number, total_amount, currency")
    .eq("purchase_order_id", purchaseOrderId);

  for (const so of supplierOrders || []) {
    const { data: supplierMember } = await supabase
      .from("company_members")
      .select("user_id, user_profiles ( email )")
      .eq("company_id", so.supplier_id)
      .eq("is_primary", true)
      .single();

    const supplierEmail = (supplierMember?.user_profiles as unknown as { email: string } | null)?.email;
    if (supplierEmail) {
      await sendNewOrderToSupplierEmail(
        supplierEmail,
        so.order_number,
        po.buyer_company_name || buyer?.full_name || "Buyer",
        formatMoney(so.total_amount, so.currency)
      );
    }
  }
}

/**
 * Order status changed — notify buyer
 */
export async function onOrderStatusChanged(
  supplierOrderId: string,
  newStatus: string
) {
  const supabase = createServiceClient();

  const { data: so } = await supabase
    .from("supplier_orders")
    .select("order_number, purchase_order_id")
    .eq("id", supplierOrderId)
    .single();

  if (!so) return;

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("buyer_user_id, user_profiles!purchase_orders_buyer_user_id_fkey ( email )")
    .eq("id", so.purchase_order_id)
    .single();

  const buyerEmail = (po?.user_profiles as unknown as { email: string } | null)?.email;

  if (buyerEmail) {
    await sendOrderStatusUpdateEmail(buyerEmail, so.order_number, newStatus);
  }
}

/**
 * RFQ receives a new quotation — notify buyer
 */
export async function onQuotationReceived(rfqId: string, supplierName: string) {
  const supabase = createServiceClient();

  const { data: rfq } = await supabase
    .from("rfqs")
    .select("rfq_number, title, buyer_user_id, user_profiles!rfqs_buyer_user_id_fkey ( email, full_name )")
    .eq("id", rfqId)
    .single();

  if (!rfq) return;

  const buyer = rfq.user_profiles as unknown as { email: string; full_name: string } | null;
  if (!buyer?.email) return;

  await sendEmail({
    to: buyer.email,
    subject: `New Quote for ${rfq.rfq_number} — ${rfq.title}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B0F1A;">New Quotation Received</h1>
        <p style="color: #4A4F5E;">Hi ${buyer.full_name},</p>
        <p style="color: #4A4F5E;"><strong>${supplierName}</strong> has submitted a quotation for your RFQ <strong>${rfq.rfq_number}</strong> — "${rfq.title}".</p>
        <p style="color: #4A4F5E;">Review and compare quotes to find the best deal.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/rfq" style="display: inline-block; padding: 12px 24px; background: #D4A853; color: #0B0F1A; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Quotations</a>
      </div>
    `,
  }, "quotation_received");
}

/**
 * Quotation accepted — notify supplier
 */
export async function onQuotationAccepted(quotationId: string) {
  const supabase = createServiceClient();

  const { data: q } = await supabase
    .from("quotations")
    .select(`
      quotation_number, supplier_id, total_amount, currency,
      rfqs ( rfq_number, title, buyer_company_name )
    `)
    .eq("id", quotationId)
    .single();

  if (!q) return;

  const { data: supplierMember } = await supabase
    .from("company_members")
    .select("user_profiles ( email, full_name )")
    .eq("company_id", q.supplier_id)
    .eq("is_primary", true)
    .single();

  const supplier = supplierMember?.user_profiles as unknown as { email: string; full_name: string } | null;
  if (!supplier?.email) return;

  const rfq = q.rfqs as unknown as { rfq_number: string; title: string; buyer_company_name: string } | null;

  await sendEmail({
    to: supplier.email,
    subject: `Quotation Accepted! — ${q.quotation_number}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B0F1A;">Your Quotation Was Accepted!</h1>
        <p style="color: #4A4F5E;">Hi ${supplier.full_name},</p>
        <p style="color: #4A4F5E;">Great news! <strong>${rfq?.buyer_company_name || "A buyer"}</strong> has accepted your quotation <strong>${q.quotation_number}</strong> for "${rfq?.title || "RFQ"}" worth <strong>${formatMoney(q.total_amount, q.currency)}</strong>.</p>
        <p style="color: #4A4F5E;">The order will be created shortly. Prepare for fulfillment!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/orders" style="display: inline-block; padding: 12px 24px; background: #D4A853; color: #0B0F1A; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Orders</a>
      </div>
    `,
  }, "quotation_accepted");
}

/**
 * Shipment dispatched — notify buyer
 */
export async function onShipmentDispatched(shipmentId: string) {
  const supabase = createServiceClient();

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("shipment_number, supplier_order_id, tracking_number, estimated_delivery_at")
    .eq("id", shipmentId)
    .single();

  if (!shipment) return;

  const { data: so } = await supabase
    .from("supplier_orders")
    .select("order_number, purchase_order_id")
    .eq("id", shipment.supplier_order_id)
    .single();

  if (!so) return;

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("buyer_user_id, user_profiles!purchase_orders_buyer_user_id_fkey ( email, full_name )")
    .eq("id", so.purchase_order_id)
    .single();

  const buyer = po?.user_profiles as unknown as { email: string; full_name: string } | null;
  if (!buyer?.email) return;

  const eta = shipment.estimated_delivery_at
    ? new Date(shipment.estimated_delivery_at).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })
    : "TBD";

  await sendEmail({
    to: buyer.email,
    subject: `Shipment Dispatched — ${so.order_number}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B0F1A;">Your Order is On Its Way!</h1>
        <p style="color: #4A4F5E;">Hi ${buyer.full_name},</p>
        <p style="color: #4A4F5E;">Order <strong>${so.order_number}</strong> has been dispatched.</p>
        ${shipment.tracking_number ? `<p style="color: #4A4F5E;">Tracking: <strong>${shipment.tracking_number}</strong></p>` : ""}
        <p style="color: #4A4F5E;">Estimated delivery: <strong>${eta}</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D4A853; color: #0B0F1A; text-decoration: none; border-radius: 9999px; font-weight: 600;">Track Order</a>
      </div>
    `,
  }, "shipment_dispatched");
}

/**
 * Shipment delivered — notify buyer
 */
export async function onShipmentDelivered(shipmentId: string) {
  const supabase = createServiceClient();

  const { data: shipment } = await supabase
    .from("b2b_shipments")
    .select("supplier_order_id")
    .eq("id", shipmentId)
    .single();

  if (!shipment) return;

  const { data: so } = await supabase
    .from("supplier_orders")
    .select("order_number, purchase_order_id")
    .eq("id", shipment.supplier_order_id)
    .single();

  if (!so) return;

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("buyer_user_id, user_profiles!purchase_orders_buyer_user_id_fkey ( email, full_name )")
    .eq("id", so.purchase_order_id)
    .single();

  const buyer = po?.user_profiles as unknown as { email: string; full_name: string } | null;
  if (!buyer?.email) return;

  await sendEmail({
    to: buyer.email,
    subject: `Order Delivered — ${so.order_number}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B0F1A;">Order Delivered!</h1>
        <p style="color: #4A4F5E;">Hi ${buyer.full_name},</p>
        <p style="color: #4A4F5E;">Your order <strong>${so.order_number}</strong> has been delivered successfully.</p>
        <p style="color: #4A4F5E;">Please confirm delivery and leave a review for the supplier.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D4A853; color: #0B0F1A; text-decoration: none; border-radius: 9999px; font-weight: 600;">Confirm Delivery</a>
      </div>
    `,
  }, "shipment_delivered");
}

/**
 * Settlement paid — notify supplier
 */
export async function onSettlementPaid(settlementId: string) {
  const supabase = createServiceClient();

  const { data: settlement } = await supabase
    .from("settlements")
    .select("settlement_number, net_payout, currency, supplier_id")
    .eq("id", settlementId)
    .single();

  if (!settlement) return;

  const { data: supplierMember } = await supabase
    .from("company_members")
    .select("user_profiles ( email, full_name )")
    .eq("company_id", settlement.supplier_id)
    .eq("is_primary", true)
    .single();

  const supplier = supplierMember?.user_profiles as unknown as { email: string; full_name: string } | null;
  if (!supplier?.email) return;

  await sendEmail({
    to: supplier.email,
    subject: `Payout Processed — ${settlement.settlement_number}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B0F1A;">Payout Processed!</h1>
        <p style="color: #4A4F5E;">Hi ${supplier.full_name},</p>
        <p style="color: #4A4F5E;">Your settlement <strong>${settlement.settlement_number}</strong> of <strong>${formatMoney(settlement.net_payout, settlement.currency)}</strong> has been paid out.</p>
        <p style="color: #4A4F5E;">The funds should arrive in your account within 1-3 business days.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/settlements" style="display: inline-block; padding: 12px 24px; background: #D4A853; color: #0B0F1A; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Settlements</a>
      </div>
    `,
  }, "settlement_paid");
}
