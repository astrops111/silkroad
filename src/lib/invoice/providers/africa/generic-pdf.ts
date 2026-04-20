import type { InvoiceProvider, InvoiceData, InvoiceIssueResult } from "../../types";

/**
 * Generic PDF invoice generator for African countries without mandatory e-invoice systems.
 * Generates a platform-issued invoice with full tax breakdown.
 * In production, use @react-pdf/renderer or puppeteer for PDF generation.
 */
export const genericPdfProvider: InvoiceProvider = {
  name: "generic_pdf",
  supportedCountries: [
    "GH", "NG", "SN", "CI", "CM", "ML", "BF", "GN", "BJ", "TG", "NE",
    "TZ", "CD", "MZ", "ZM", "ZW", "MW", "BW", "NA", "AO", "MG",
    "MA", "TN", "DZ", "SL", "LR", "ET",
  ],

  async issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult> {
    // Generate invoice number: INV-{YYYYMMDD}-{random}
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invoiceNumber = `INV-${date}-${rand}`;

    // Build invoice HTML (for PDF conversion)
    const html = generateInvoiceHtml(data, invoiceNumber);

    // In production: convert HTML to PDF via @react-pdf/renderer or Puppeteer
    // For now, store the HTML and mark as issued
    // const pdfBuffer = await htmlToPdf(html);
    // const pdfUrl = await uploadToStorage(pdfBuffer, `invoices/${invoiceNumber}.pdf`);

    return {
      success: true,
      invoiceNumber,
      pdfUrl: undefined, // Will be set after PDF generation is implemented
      rawResponse: { html, generatedAt: new Date().toISOString() },
    };
  },

  async voidInvoice(invoiceNumber: string, reason: string) {
    // For generic PDF invoices, voiding is just a status change in the database
    // A credit note PDF would be generated
    return { success: true };
  },
};

function generateInvoiceHtml(data: InvoiceData, invoiceNumber: string): string {
  const lineItemRows = data.lineItems
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.unitPrice, data.currency)}</td>
      <td style="text-align:right">${formatCurrency(item.amount, data.currency)}</td>
      <td style="text-align:right">${formatCurrency(item.taxAmount, data.currency)}</td>
    </tr>`
    )
    .join("");

  const taxBreakdownRows = (data.taxBreakdown || [])
    .map(
      (t) => `
    <tr>
      <td>${t.name} (${(t.rate * 100).toFixed(1)}%)</td>
      <td style="text-align:right">${formatCurrency(t.amount, data.currency)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 40px; font-size: 14px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 800; color: #D4A853; }
    .invoice-number { font-size: 12px; color: #666; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party h3 { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
    .party p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f0e8; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .totals { margin-top: 20px; width: 300px; margin-left: auto; }
    .totals tr td { border: none; padding: 6px 10px; }
    .totals .grand-total td { font-size: 18px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 12px; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Silk Road Africa</div>
      <div style="color:#666;font-size:12px;">B2B Trade Platform</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:700;">INVOICE</div>
      <div class="invoice-number">${invoiceNumber}</div>
      <div class="invoice-number">Date: ${data.invoiceDate}</div>
      ${data.orderNumber ? `<div class="invoice-number">Order: ${data.orderNumber}</div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p><strong>${data.issuerName}</strong></p>
      ${data.issuerTaxId ? `<p>Tax ID: ${data.issuerTaxId}</p>` : ""}
      ${data.issuerAddress ? `<p>${data.issuerAddress}</p>` : ""}
      <p>${data.issuerCountry}</p>
    </div>
    <div class="party">
      <h3>To</h3>
      <p><strong>${data.recipientName}</strong></p>
      ${data.recipientTaxId ? `<p>Tax ID: ${data.recipientTaxId}</p>` : ""}
      ${data.recipientAddress ? `<p>${data.recipientAddress}</p>` : ""}
      <p>${data.recipientCountry}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Amount</th>
        <th style="text-align:right">Tax</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Subtotal</td>
      <td style="text-align:right">${formatCurrency(data.subtotal, data.currency)}</td>
    </tr>
    ${taxBreakdownRows}
    <tr>
      <td><strong>Total Tax</strong></td>
      <td style="text-align:right"><strong>${formatCurrency(data.taxAmount, data.currency)}</strong></td>
    </tr>
    <tr class="grand-total">
      <td>Total Due</td>
      <td style="text-align:right">${formatCurrency(data.totalAmount, data.currency)}</td>
    </tr>
  </table>

  ${data.paymentTerms ? `<p><strong>Payment Terms:</strong> ${data.paymentTerms}</p>` : ""}
  ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}

  <div class="footer">
    <p>This invoice was generated by Silk Road Africa B2B Trade Platform.</p>
    <p>For questions, contact support@silkroad.africa</p>
  </div>
</body>
</html>`;
}

function formatCurrency(amount: number, currency: string): string {
  // Use centralized currency config for correct decimal handling
  // Lazy import to avoid circular deps in PDF context
  const ZERO_DECIMAL = new Set(["UGX", "TZS", "RWF", "GNF", "XOF", "XAF", "CDF", "MWK", "MGA"]);
  const symbols: Record<string, string> = {
    USD: "$", GHS: "GH\u20B5", NGN: "\u20A6", KES: "KSh", UGX: "USh",
    TZS: "TSh", ZAR: "R", CNY: "\u00A5", EUR: "\u20AC", GBP: "\u00A3",
    XOF: "CFA", XAF: "FCFA", RWF: "FRw", ETB: "Br", EGP: "E\u00A3",
    MAD: "MAD", MZN: "MT", ZMW: "ZK", MWK: "MK", CDF: "FC", MGA: "Ar",
  };
  const symbol = symbols[currency] || currency;
  const isZero = ZERO_DECIMAL.has(currency);
  const displayValue = isZero ? amount : amount / 100;
  const decimals = isZero ? 0 : 2;
  return `${symbol} ${displayValue.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
