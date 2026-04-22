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
 * Order placed — notify internal ops inbox with full buyer + order detail.
 * Fires at order creation (pre-payment) so ops can begin sourcing.
 */
const OPS_NOTIFICATION_EMAIL = "masterai.tw99@gmail.com";

function esc(v: string | null | undefined): string {
  if (!v) return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Walk-in buyer request — someone clicked the "Can't find what you want?
 * Send us a request" banner and submitted a need. Notify ops so they can
 * follow up and source it.
 */
export async function onBuyerRequestSubmitted(buyerRequestId: string) {
  const supabase = createServiceClient();

  const { data: req } = await supabase
    .from("buyer_requests")
    .select(`
      id, name, email, phone, company_name, country_code,
      category, title, description, quantity, budget_usd, timeline,
      locale, source_path, created_at, buyer_user_id
    `)
    .eq("id", buyerRequestId)
    .single();

  if (!req) return;

  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/superadmin/buyer-requests/${req.id}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:680px;margin:0 auto;color:#14110F;">
      <h1 style="margin:0 0 4px 0;">New Buyer Request</h1>
      <div style="color:#888;font-size:13px;margin-bottom:20px;">
        Submitted ${new Date(req.created_at).toISOString()}${req.buyer_user_id ? " · signed-in buyer" : " · anonymous visitor"}
      </div>

      <h2 style="font-size:16px;margin:16px 0 8px;">What they want</h2>
      <div style="padding:14px;background:#fafafa;border-radius:8px;">
        <div style="font-weight:600;font-size:15px;margin-bottom:6px;">${esc(req.title)}</div>
        <div style="color:#444;font-size:13px;white-space:pre-wrap;line-height:1.5;">${esc(req.description)}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
        <tr><td style="padding:6px 0;width:140px;color:#666;">Category</td><td>${esc(req.category)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Quantity</td><td>${esc(req.quantity)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Budget (USD)</td><td>${esc(req.budget_usd)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Timeline</td><td>${esc(req.timeline)}</td></tr>
      </table>

      <h2 style="font-size:16px;margin:20px 0 8px;">Contact</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;width:140px;color:#666;">Name</td><td>${esc(req.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Email</td><td><a href="mailto:${esc(req.email)}">${esc(req.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Phone</td><td>${esc(req.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Company</td><td>${esc(req.company_name)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Country</td><td>${esc(req.country_code)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Locale</td><td>${esc(req.locale)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Source page</td><td>${esc(req.source_path)}</td></tr>
      </table>

      ${
        process.env.NEXT_PUBLIC_APP_URL
          ? `<p style="margin-top:24px;"><a href="${adminUrl}" style="display:inline-block;padding:10px 18px;background:#D89F2E;color:#14110F;text-decoration:none;border-radius:9999px;font-weight:600;">Open in admin</a></p>`
          : ""
      }
    </div>
  `;

  await sendEmail(
    {
      to: OPS_NOTIFICATION_EMAIL,
      subject: `[Buyer Request] ${req.title.slice(0, 80)} — ${req.name}`,
      html,
    },
    "buyer_request_submitted"
  );
}

export async function onOrderPlacedOpsNotify(purchaseOrderId: string) {
  const supabase = createServiceClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select(`
      id, order_number, grand_total, subtotal, total_shipping, total_tax,
      currency, buyer_user_id, buyer_company_name, buyer_tax_id, note, status, created_at
    `)
    .eq("id", purchaseOrderId)
    .single();

  if (!po) return;

  // Manual joins — partitioned tables have no declared FKs, so PostgREST embedding is unavailable here.
  const { data: buyer } = await supabase
    .from("user_profiles")
    .select("email, full_name, phone, country_code")
    .eq("id", po.buyer_user_id)
    .single();

  const { data: supplierOrders } = await supabase
    .from("supplier_orders")
    .select("id, order_number, subtotal, shipping_fee, tax_amount, total_amount, currency, supplier_id")
    .eq("purchase_order_id", purchaseOrderId);

  const supplierIds = Array.from(new Set((supplierOrders || []).map((s) => s.supplier_id)));
  const supplierOrderIds = (supplierOrders || []).map((s) => s.id);

  const [{ data: suppliers }, { data: items }] = await Promise.all([
    supplierIds.length
      ? supabase.from("companies").select("id, name, country_code").in("id", supplierIds)
      : Promise.resolve({ data: [] as { id: string; name: string; country_code: string }[] }),
    supplierOrderIds.length
      ? supabase
          .from("supplier_order_items")
          .select("supplier_order_id, product_name, variant_name, unit_price, quantity, subtotal, currency")
          .in("supplier_order_id", supplierOrderIds)
      : Promise.resolve({ data: [] as Array<{
          supplier_order_id: string;
          product_name: string;
          variant_name: string | null;
          unit_price: number;
          quantity: number;
          subtotal: number;
          currency: string;
        }> }),
  ]);

  const supplierMap = new Map((suppliers || []).map((c) => [c.id, c]));
  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items || []) {
    const list = itemsByOrder.get(it.supplier_order_id) || [];
    list.push(it);
    itemsByOrder.set(it.supplier_order_id, list);
  }

  const rows = (supplierOrders || []).map((so) => {
    const supplier = supplierMap.get(so.supplier_id) || null;
    const soItems = itemsByOrder.get(so.id) || [];
    const itemRows = soItems
      .map(
        (it) => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">${it.product_name}${it.variant_name ? ` <span style="color:#888;">(${it.variant_name})</span>` : ""}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(it.unit_price, it.currency)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(it.subtotal, it.currency)}</td>
          </tr>`
      )
      .join("");

    return `
      <div style="margin:16px 0;padding:12px;border:1px solid #eee;border-radius:8px;">
        <div style="font-weight:600;margin-bottom:6px;">Supplier Order ${so.order_number}</div>
        <div style="color:#555;font-size:13px;margin-bottom:8px;">
          Supplier: <strong>${supplier?.name ?? "—"}</strong> (${supplier?.country_code ?? "—"})
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#fafafa;">
              <th style="padding:6px 10px;text-align:left;">Product</th>
              <th style="padding:6px 10px;text-align:center;">Qty</th>
              <th style="padding:6px 10px;text-align:right;">Unit</th>
              <th style="padding:6px 10px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:8px;font-size:13px;color:#444;">
          Subtotal: ${formatMoney(so.subtotal, so.currency)} ·
          Shipping: ${formatMoney(so.shipping_fee, so.currency)} ·
          Tax: ${formatMoney(so.tax_amount, so.currency)} ·
          <strong>Total: ${formatMoney(so.total_amount, so.currency)}</strong>
        </div>
      </div>`;
  }).join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;color:#14110F;">
      <h1 style="margin:0 0 4px 0;">New Order Placed</h1>
      <div style="color:#888;font-size:13px;margin-bottom:16px;">
        Order ${po.order_number} · ${po.status} · ${new Date(po.created_at).toISOString()}
      </div>

      <h2 style="font-size:16px;margin:20px 0 8px;">Buyer</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 0;width:140px;color:#666;">Name</td><td>${buyer?.full_name ?? "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Email</td><td>${buyer?.email ?? "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Phone</td><td>${buyer?.phone ?? "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Country</td><td>${buyer?.country_code ?? "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Company</td><td>${po.buyer_company_name ?? "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Tax ID</td><td>${po.buyer_tax_id ?? "—"}</td></tr>
      </table>

      <h2 style="font-size:16px;margin:20px 0 8px;">Order Items</h2>
      ${rows || '<div style="color:#888;">No supplier orders found.</div>'}

      <h2 style="font-size:16px;margin:20px 0 8px;">Totals</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 0;width:160px;color:#666;">Subtotal</td><td>${formatMoney(po.subtotal, po.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Shipping</td><td>${formatMoney(po.total_shipping, po.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Tax</td><td>${formatMoney(po.total_tax, po.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;font-weight:600;">Grand Total</td><td style="font-weight:600;">${formatMoney(po.grand_total, po.currency)}</td></tr>
      </table>

      ${po.note ? `<h2 style="font-size:16px;margin:20px 0 8px;">Buyer Note</h2><div style="padding:10px;background:#fafafa;border-radius:6px;color:#333;white-space:pre-wrap;">${po.note}</div>` : ""}
    </div>
  `;

  await sendEmail(
    {
      to: OPS_NOTIFICATION_EMAIL,
      subject: `[New Order] ${po.order_number} — ${formatMoney(po.grand_total, po.currency)}`,
      html,
    },
    "ops_order_placed"
  );
}

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
        <h1 style="color: #14110F;">New Quotation Received</h1>
        <p style="color: #4C463D;">Hi ${buyer.full_name},</p>
        <p style="color: #4C463D;"><strong>${supplierName}</strong> has submitted a quotation for your RFQ <strong>${rfq.rfq_number}</strong> — "${rfq.title}".</p>
        <p style="color: #4C463D;">Review and compare quotes to find the best deal.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/rfq" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Quotations</a>
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
        <h1 style="color: #14110F;">Your Quotation Was Accepted!</h1>
        <p style="color: #4C463D;">Hi ${supplier.full_name},</p>
        <p style="color: #4C463D;">Great news! <strong>${rfq?.buyer_company_name || "A buyer"}</strong> has accepted your quotation <strong>${q.quotation_number}</strong> for "${rfq?.title || "RFQ"}" worth <strong>${formatMoney(q.total_amount, q.currency)}</strong>.</p>
        <p style="color: #4C463D;">The order will be created shortly. Prepare for fulfillment!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Orders</a>
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
        <h1 style="color: #14110F;">Your Order is On Its Way!</h1>
        <p style="color: #4C463D;">Hi ${buyer.full_name},</p>
        <p style="color: #4C463D;">Order <strong>${so.order_number}</strong> has been dispatched.</p>
        ${shipment.tracking_number ? `<p style="color: #4C463D;">Tracking: <strong>${shipment.tracking_number}</strong></p>` : ""}
        <p style="color: #4C463D;">Estimated delivery: <strong>${eta}</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">Track Order</a>
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
        <h1 style="color: #14110F;">Order Delivered!</h1>
        <p style="color: #4C463D;">Hi ${buyer.full_name},</p>
        <p style="color: #4C463D;">Your order <strong>${so.order_number}</strong> has been delivered successfully.</p>
        <p style="color: #4C463D;">Please confirm delivery and leave a review for the supplier.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">Confirm Delivery</a>
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
        <h1 style="color: #14110F;">Payout Processed!</h1>
        <p style="color: #4C463D;">Hi ${supplier.full_name},</p>
        <p style="color: #4C463D;">Your settlement <strong>${settlement.settlement_number}</strong> of <strong>${formatMoney(settlement.net_payout, settlement.currency)}</strong> has been paid out.</p>
        <p style="color: #4C463D;">The funds should arrive in your account within 1-3 business days.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/settlements" style="display: inline-block; padding: 12px 24px; background: #D89F2E; color: #14110F; text-decoration: none; border-radius: 9999px; font-weight: 600;">View Settlements</a>
      </div>
    `,
  }, "settlement_paid");
}
