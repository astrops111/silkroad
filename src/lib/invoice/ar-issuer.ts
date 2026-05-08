// AR (accounts-receivable) invoice issuer for buyers.
//
// Takes a supplier_order id, builds InvoiceData from the order and the
// buyer's country, calls issueInvoice() (which routes to ETIMS / EFRIS /
// generic-PDF per the buyer's country), then persists the result to
// b2b_invoices so buyers can retrieve it later.
//
// Called by POST /api/invoices/buyer.

import { createServiceClient } from "@/lib/supabase/server";
import { issueInvoice } from "./invoice-issuer";
import type { InvoiceData, InvoiceIssueResult } from "./types";

export interface ARInvoiceInput {
  supplierOrderId: string;
  shipmentId?: string;
  invoiceType?: InvoiceData["invoiceType"];
  notes?: string;
  paymentTerms?: string;
}

export interface ARInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  externalReference?: string;
  error?: string;
}

export async function issueARInvoice(input: ARInvoiceInput): Promise<ARInvoiceResult> {
  const supabase = createServiceClient();

  // ── 1. Load the supplier order ───────────────────────────────
  const { data: order } = await supabase
    .from("supplier_orders")
    .select("id, purchase_order_id, supplier_id, subtotal, total_amount, currency, ship_to_country")
    .eq("id", input.supplierOrderId)
    .maybeSingle();

  if (!order) return { success: false, error: "Supplier order not found" };

  // ── 2. Load line items ───────────────────────────────────────
  const { data: items } = await supabase
    .from("supplier_order_items")
    .select("product_name, variant_name, unit_price, quantity, subtotal, tax_amount")
    .eq("supplier_order_id", order.id);

  // ── 3. Load purchase order + buyer company ───────────────────
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("buyer_company_id, order_number, buyer_tax_id, buyer_company_name")
    .eq("id", order.purchase_order_id)
    .maybeSingle();

  const [buyerRes, supplierRes] = await Promise.all([
    po?.buyer_company_id
      ? supabase
          .from("companies")
          .select("id, name, tax_id, country_code, address")
          .eq("id", po.buyer_company_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("companies")
      .select("id, name, tax_id, country_code, address")
      .eq("id", order.supplier_id)
      .maybeSingle(),
  ]);

  const buyerCompany = buyerRes.data;
  const supplierCompany = supplierRes.data;
  if (!supplierCompany) return { success: false, error: "Supplier company not found" };

  const recipientCountry =
    buyerCompany?.country_code ?? order.ship_to_country ?? "NG";

  // ── 4. Build InvoiceData ─────────────────────────────────────
  const taxRate = TAX_RATE_BY_COUNTRY[recipientCountry] ?? 0;
  const subtotalMinor = Number(order.subtotal ?? 0);
  const taxMinor = Math.round(subtotalMinor * taxRate);
  const totalMinor = subtotalMinor + taxMinor;

  const lineItems = (items ?? []).map((it) => {
    const qty = Number(it.quantity);
    const unit = Number(it.unit_price);
    const amount = Number(it.subtotal ?? unit * qty);
    const tax = Number(it.tax_amount ?? 0);
    return {
      name: [it.product_name, it.variant_name].filter(Boolean).join(" — "),
      quantity: qty,
      unitPrice: unit,
      amount,
      taxAmount: tax,
    };
  });

  const invoiceData: InvoiceData = {
    invoiceType: input.invoiceType ?? "b2b_standard",
    invoiceDate: new Date().toISOString().slice(0, 10),

    issuerCompanyId: supplierCompany.id,
    issuerName: supplierCompany.name,
    issuerTaxId: supplierCompany.tax_id ?? undefined,
    issuerAddress: supplierCompany.address ?? undefined,
    issuerCountry: supplierCompany.country_code,

    recipientCompanyId: buyerCompany?.id ?? undefined,
    recipientName: buyerCompany?.name ?? po?.buyer_company_name ?? "Buyer",
    recipientTaxId: buyerCompany?.tax_id ?? po?.buyer_tax_id ?? undefined,
    recipientAddress: buyerCompany?.address ?? undefined,
    recipientCountry,

    subtotal: subtotalMinor,
    taxRate,
    taxAmount: taxMinor,
    totalAmount: totalMinor,
    currency: String(order.currency ?? "USD"),

    taxType: taxRate > 0 ? "taxable" : "zero_rated",
    lineItems,

    supplierOrderId: order.id,
    purchaseOrderId: order.purchase_order_id ?? undefined,
    orderNumber: po?.order_number ?? undefined,

    notes: input.notes,
    paymentTerms: input.paymentTerms ?? "Net 30",
  };

  // ── 5. Issue via country-appropriate provider ─────────────────
  let issueResult: InvoiceIssueResult;
  try {
    issueResult = await issueInvoice(invoiceData);
  } catch (err) {
    return { success: false, error: `Invoice provider threw: ${(err as Error).message}` };
  }

  if (!issueResult.success) {
    return { success: false, error: issueResult.error ?? "Invoice provider returned failure" };
  }

  const invoiceNumber = issueResult.invoiceNumber ?? generateFallbackNumber();

  // ── 6. Persist to b2b_invoices ───────────────────────────────
  const { data: saved, error: saveErr } = await supabase
    .from("b2b_invoices")
    .insert({
      invoice_number: invoiceNumber,
      invoice_type: invoiceData.invoiceType,
      supplier_order_id: order.id,
      purchase_order_id: order.purchase_order_id ?? undefined,
      shipment_id: input.shipmentId ?? undefined,
      issuer_company_id: supplierCompany.id,
      issuer_company_name: supplierCompany.name,
      issuer_tax_id: supplierCompany.tax_id ?? undefined,
      recipient_company_id: buyerCompany?.id ?? undefined,
      recipient_company_name: buyerCompany?.name ?? po?.buyer_company_name ?? undefined,
      recipient_tax_id: buyerCompany?.tax_id ?? po?.buyer_tax_id ?? undefined,
      subtotal: subtotalMinor,
      tax_rate: taxRate,
      tax_amount: taxMinor,
      total_amount: totalMinor,
      currency: invoiceData.currency,
      tax_type: invoiceData.taxType,
      line_items: lineItems,
      country_code: recipientCountry,
      status: "issued",
      issued_at: new Date().toISOString(),
      html_storage_path: issueResult.pdfUrl ?? undefined,
    })
    .select("id")
    .single();

  if (saveErr) {
    // Invoice was issued by the provider but we failed to persist it locally.
    // Return partial success so the caller still gets the invoice number.
    console.error("issueARInvoice: failed to save to b2b_invoices", saveErr);
    return {
      success: true,
      invoiceNumber,
      externalReference: issueResult.externalReference,
      error: "Invoice issued but DB persist failed — check logs",
    };
  }

  return {
    success: true,
    invoiceId: saved.id,
    invoiceNumber,
    externalReference: issueResult.externalReference,
  };
}

// Standard VAT rates by destination country (Africa focus).
const TAX_RATE_BY_COUNTRY: Record<string, number> = {
  KE: 0.16,   // Kenya
  NG: 0.075,  // Nigeria
  GH: 0.15,   // Ghana
  UG: 0.18,   // Uganda
  TZ: 0.18,   // Tanzania
  RW: 0.18,   // Rwanda
  ET: 0.15,   // Ethiopia
  EG: 0.14,   // Egypt
  MA: 0.20,   // Morocco
  SN: 0.18,   // Senegal
  CI: 0.18,   // Côte d'Ivoire
  CM: 0.1925, // Cameroon
  CD: 0.16,   // DRC
  ZA: 0.15,   // South Africa
  ZM: 0.16,   // Zambia
  ZW: 0.15,   // Zimbabwe
};

function generateFallbackNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SRA-${date}-${rand}`;
}
