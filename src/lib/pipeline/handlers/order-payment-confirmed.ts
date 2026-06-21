import type { EventHandler } from "../types";
import { updateSupplierOrderStatus } from "@/lib/actions/orders";
import { issueInvoice } from "@/lib/invoice";
import { sendNewOrderToSupplierEmail } from "@/lib/email";

/**
 * order.payment_confirmed
 *
 * Triggered when supplier_order transitions to 'paid' (via XTransfer,
 * Flutterwave, or Stripe). The gateway webhook sends the buyer their
 * confirmation email immediately; this handler handles the supplier side.
 *
 * Actions:
 *   1. Notify supplier (from platform — buyer identity is never revealed)
 *   2. Issue proforma invoice (platform's PO to supplier)
 *   3. Transition paid → confirmed
 *
 * The DB trigger on supplier_orders.status = 'confirmed' automatically
 * enqueues order.supplier_notified as the next pipeline step.
 */
export const handler: EventHandler = async (event, supabase) => {
  const { supplier_order_id } = event;
  if (!supplier_order_id) {
    return { success: false, error: "Missing supplier_order_id" };
  }

  const { data: order, error: orderErr } = await supabase
    .from("supplier_orders")
    .select(`
      id, order_number, supplier_id, total_amount, currency,
      companies!supplier_orders_supplier_id_fkey (name, country_code, tax_id, address),
      supplier_order_items (
        id, product_name, quantity, unit_price, line_total, tax_amount, hs_code
      )
    `)
    .eq("id", supplier_order_id)
    .single();

  if (orderErr || !order) {
    return { success: false, error: `Order fetch failed: ${orderErr?.message}` };
  }

  // ── 1. Notify supplier — platform is the buyer, buyer identity is hidden ──
  const { data: supplierMember } = await supabase
    .from("company_members")
    .select("user_profiles (email)")
    .eq("company_id", order.supplier_id)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  const supplierEmail = (supplierMember?.user_profiles as unknown as { email?: string } | null)?.email;
  if (supplierEmail) {
    const amountStr = `${order.currency} ${(order.total_amount / 100).toFixed(2)}`;
    await sendNewOrderToSupplierEmail(
      supplierEmail,
      order.order_number,
      "Platform",      // never reveal buyer company to supplier
      amountStr
    ).catch((err) => console.error("[pipeline:order.payment_confirmed] Supplier email failed:", err));
  }

  // ── 2. Issue proforma invoice (platform's PO to supplier) ─────────────────
  const supplier = order.companies as unknown as {
    name: string; country_code: string; tax_id?: string; address?: string;
  } | null;

  const lineItems = (order.supplier_order_items as unknown as Array<{
    id: string; product_name: string; quantity: number;
    unit_price: number; line_total: number; tax_amount: number; hs_code?: string;
  }> ?? []).map((item) => ({
    name: item.product_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    amount: item.line_total,
    taxAmount: item.tax_amount ?? 0,
    hsCode: item.hs_code,
  }));

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxAmount = lineItems.reduce((s, i) => s + i.taxAmount, 0);
  const today = new Date().toISOString().split("T")[0];

  const invoiceResult = await issueInvoice({
    invoiceType: "proforma",
    invoiceDate: today,
    issuerCompanyId: process.env.PLATFORM_COMPANY_ID ?? "platform",
    issuerName: process.env.PLATFORM_NAME ?? "Silk Road Platform",
    issuerCountry: process.env.PLATFORM_COUNTRY ?? "SG",
    recipientCompanyId: order.supplier_id,
    recipientName: supplier?.name ?? "Supplier",
    recipientCountry: supplier?.country_code ?? "CN",
    recipientTaxId: supplier?.tax_id,
    recipientAddress: supplier?.address,
    currency: order.currency,
    subtotal,
    taxRate: subtotal > 0 ? taxAmount / subtotal : 0,
    taxAmount,
    totalAmount: order.total_amount,
    taxType: "taxable",
    lineItems,
    supplierOrderId: supplier_order_id,
    orderNumber: order.order_number,
  });

  if (!invoiceResult.success) {
    return { success: false, error: `Invoice generation failed: ${invoiceResult.error}` };
  }

  // ── 3. Transition paid → confirmed ────────────────────────────────────────
  // DB trigger fires on this update → enqueues order.supplier_notified.
  await updateSupplierOrderStatus(
    supplier_order_id,
    "confirmed",
    "pipeline",
    "Platform PO issued to supplier"
  );

  return {
    success: true,
    result: {
      invoiceNumber: invoiceResult.invoiceNumber,
      orderNumber: order.order_number,
      supplierId: order.supplier_id,
    },
  };
};
