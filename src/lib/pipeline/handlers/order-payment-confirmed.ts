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
    .select("id, order_number, supplier_id, total_amount, currency")
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
  const invoiceResult = await issueInvoice({
    supplierOrderId: supplier_order_id,
    invoiceType: "proforma",
  });

  if (!invoiceResult.success) {
    return { success: false, error: `Invoice generation failed: ${invoiceResult.error}` };
  }

  // ── 3. Transition paid → confirmed ────────────────────────────────────────
  // DB trigger fires on this update → enqueues order.supplier_notified.
  await updateSupplierOrderStatus(
    supplier_order_id,
    "confirmed",
    undefined,
    "Platform PO issued to supplier"
  );

  return {
    success: true,
    result: {
      invoiceId: invoiceResult.invoiceId,
      orderNumber: order.order_number,
      supplierId: order.supplier_id,
    },
  };
};
