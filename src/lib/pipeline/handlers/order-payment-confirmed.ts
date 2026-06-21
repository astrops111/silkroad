import type { EventHandler } from "../types";
import { issueInvoice } from "@/lib/invoice";
import { sendNewOrderToSupplierEmail } from "@/lib/email";
import { logError } from "@/lib/logging";

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
 *
 * Idempotency contract:
 *   - Invoice: checks b2b_invoices before calling issueInvoice so retries
 *     don't register a second document with the country e-invoice authority.
 *   - Status update: guarded with .eq("status","paid") so a retry on an
 *     already-confirmed order is a silent no-op rather than a double-transition.
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
    console.error("[pipeline:order.payment_confirmed] Order fetch error:", orderErr);
    return { success: false, error: "Order data unavailable — see server logs" };
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
    ).catch((err) => logError({ errorCode: "EMAIL_SUPPLIER_NEW_ORDER", message: err instanceof Error ? err.message : String(err), source: "pipeline:order.payment_confirmed", severity: "warning", metadata: { supplierOrderId: supplier_order_id } }).catch(() => {}));
  }

  // ── 2. Issue proforma invoice (platform's PO to supplier) ─────────────────
  const supplier = order.companies as unknown as {
    name: string; country_code: string; tax_id?: string; address?: string;
  } | null;

  const lineItems = (order.supplier_order_items as unknown as Array<{
    id: string; product_name: string; quantity: number;
    unit_price: number; line_total: number; tax_amount: number; hs_code?: string;
  }> ?? []).map((item) => ({
    name:      item.product_name,
    quantity:  item.quantity,
    unitPrice: item.unit_price,
    amount:    item.line_total,
    taxAmount: item.tax_amount ?? 0,
    hsCode:    item.hs_code,
  }));

  const subtotal  = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxAmount = lineItems.reduce((s, i) => s + i.taxAmount, 0);
  const today     = new Date().toISOString().split("T")[0];

  // Reconciliation guard — catch data corruption before it reaches the e-invoice authority
  if (subtotal + taxAmount !== order.total_amount) {
    console.error(
      `[pipeline:order.payment_confirmed] Invoice reconciliation mismatch for ${supplier_order_id}: ` +
      `subtotal(${subtotal}) + tax(${taxAmount}) = ${subtotal + taxAmount} ≠ total(${order.total_amount})`
    );
  }

  // Idempotency: check whether we already issued a proforma for this order.
  // Prevents a second submission to Kenya eTIMS / Egypt ETA on handler retry.
  const { data: existingInvoice } = await supabase
    .from("b2b_invoices")
    .select("invoice_number")
    .eq("supplier_order_id", supplier_order_id)
    .eq("invoice_type", "proforma")
    .limit(1)
    .maybeSingle();

  let invoiceNumber: string;

  if (existingInvoice) {
    invoiceNumber = existingInvoice.invoice_number;
  } else {
    const invoiceResult = await issueInvoice({
      invoiceType:        "proforma",
      invoiceDate:        today,
      issuerCompanyId:    process.env.PLATFORM_COMPANY_ID ?? "platform",
      issuerName:         process.env.PLATFORM_NAME       ?? "Silk Road Platform",
      issuerCountry:      process.env.PLATFORM_COUNTRY    ?? "SG",
      recipientCompanyId: order.supplier_id,
      recipientName:      supplier?.name         ?? "Supplier",
      recipientCountry:   supplier?.country_code ?? "CN",
      recipientTaxId:     supplier?.tax_id,
      recipientAddress:   supplier?.address,
      currency:           order.currency,
      subtotal,
      taxRate:            subtotal > 0 ? taxAmount / subtotal : 0,
      taxAmount,
      totalAmount:        order.total_amount,
      taxType:            "taxable",
      lineItems,
      supplierOrderId:    supplier_order_id,
      orderNumber:        order.order_number,
    });

    if (!invoiceResult.success) {
      return { success: false, error: `Invoice generation failed: ${invoiceResult.error}` };
    }

    invoiceNumber = invoiceResult.invoiceNumber!;

    // Persist to b2b_invoices so future retries find it and skip the provider call
    const { error: persistErr } = await supabase.from("b2b_invoices").insert({
      invoice_number:         invoiceNumber,
      invoice_type:           "proforma",
      supplier_order_id,
      issuer_company_id:      process.env.PLATFORM_COMPANY_ID ?? "platform",
      issuer_company_name:    process.env.PLATFORM_NAME       ?? "Silk Road Platform",
      recipient_company_id:   order.supplier_id,
      recipient_company_name: supplier?.name ?? "Supplier",
      recipient_tax_id:       supplier?.tax_id,
      subtotal,
      tax_rate:               subtotal > 0 ? taxAmount / subtotal : 0,
      tax_amount:             taxAmount,
      total_amount:           order.total_amount,
      currency:               order.currency,
      tax_type:               "taxable",
      line_items:             lineItems,
      country_code:           supplier?.country_code ?? "CN",
      status:                 "issued",
      issued_at:              new Date().toISOString(),
    });

    if (persistErr) {
      // Invoice was issued by the provider but DB persist failed.
      // Log it — the invoice_number is still returned so the caller can record it.
      console.error("[pipeline:order.payment_confirmed] b2b_invoices persist failed:", persistErr.message);
    }
  }

  // ── 3. Transition paid → confirmed ────────────────────────────────────────
  // .eq("status","paid") guard: if the order is already 'confirmed' (retry),
  // the UPDATE affects 0 rows and we return success without re-triggering the
  // DB trigger or writing a duplicate order_status_history row.
  const now = new Date().toISOString();
  const { data: updated } = await supabase
    .from("supplier_orders")
    .update({ status: "confirmed", confirmed_at: now, updated_at: now })
    .eq("id", supplier_order_id)
    .eq("status", "paid")
    .select("id");

  if (!updated || updated.length === 0) {
    return { success: true, result: { alreadyConfirmed: true, invoiceNumber, orderNumber: order.order_number } };
  }

  await supabase.from("order_status_history").insert({
    supplier_order_id,
    from_status: "paid",
    to_status:   "confirmed",
    changed_by:  "pipeline",
    note:        "Platform PO issued to supplier",
  });

  return {
    success: true,
    result: {
      invoiceNumber,
      orderNumber: order.order_number,
      supplierId:  order.supplier_id,
    },
  };
};
