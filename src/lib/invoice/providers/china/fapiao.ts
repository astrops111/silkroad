import type { InvoiceProvider, InvoiceData, InvoiceIssueResult } from "../../types";

/**
 * China Fapiao (发票) — Golden Tax System
 * Required for all domestic B2B transactions in China.
 * Uses third-party Fapiao service providers (e.g., Baiwang, Aisino)
 * that integrate with China's Golden Tax System (金税系统).
 *
 * Two types:
 * - fapiao_normal (普通发票) — general VAT invoice
 * - fapiao_special (专用发票) — special VAT invoice (for deductions)
 */
export const chinaFapiaoProvider: InvoiceProvider = {
  name: "china_fapiao",
  supportedCountries: ["CN"],

  async issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult> {
    const apiUrl = process.env.FAPIAO_API_URL;
    const apiKey = process.env.FAPIAO_API_KEY;
    const taxPayerId = process.env.FAPIAO_TAXPAYER_ID;

    if (!apiUrl || !apiKey || !taxPayerId) {
      return {
        success: false,
        error: "Fapiao credentials not configured. Set FAPIAO_API_URL, FAPIAO_API_KEY, FAPIAO_TAXPAYER_ID.",
      };
    }

    const isSpecial = data.invoiceType === "fapiao_special";

    // Standard Fapiao API payload (Baiwang / Aisino format)
    const payload = {
      // Seller (开票方)
      sellerTaxpayerId: taxPayerId,
      sellerName: data.issuerName,
      sellerAddress: data.issuerAddress || "",
      sellerBankAccount: "",

      // Buyer (购买方)
      buyerTaxpayerId: data.recipientTaxId || "",
      buyerName: data.recipientName,
      buyerAddress: data.recipientAddress || "",
      buyerBankAccount: "",

      // Invoice type
      invoiceType: isSpecial ? "special" : "normal",
      invoiceDate: data.invoiceDate,

      // Items (明细)
      items: data.lineItems.map((item) => ({
        name: item.name,
        specification: "",
        unit: "个",
        quantity: item.quantity,
        unitPrice: (item.unitPrice / 100).toFixed(2),
        amount: ((item.amount - item.taxAmount) / 100).toFixed(2),
        taxRate: "0.13", // Standard VAT 13%
        taxAmount: (item.taxAmount / 100).toFixed(2),
        hsCode: item.hsCode || "",
      })),

      // Totals
      totalAmount: ((data.subtotal - data.taxAmount) / 100).toFixed(2),
      totalTaxAmount: (data.taxAmount / 100).toFixed(2),
      totalAmountWithTax: (data.totalAmount / 100).toFixed(2),

      // Reference
      orderNumber: data.orderNumber || "",
      remark: data.notes || `SilkRoad Order ${data.orderNumber || ""}`,
    };

    try {
      const res = await fetch(`${apiUrl}/api/v1/invoice/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.code === "0000" || result.success) {
        return {
          success: true,
          invoiceNumber: result.data?.invoiceCode
            ? `${result.data.invoiceCode}-${result.data.invoiceNumber}`
            : result.data?.invoiceNumber,
          externalReference: result.data?.invoiceCode,
          pdfUrl: result.data?.pdfUrl,
          rawResponse: result,
        };
      }

      return {
        success: false,
        error: result.message || result.msg || "Fapiao API error",
        rawResponse: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Fapiao connection failed",
      };
    }
  },

  async voidInvoice(invoiceNumber: string, reason: string) {
    const apiUrl = process.env.FAPIAO_API_URL;
    const apiKey = process.env.FAPIAO_API_KEY;

    if (!apiUrl || !apiKey) {
      return { success: false, error: "Fapiao credentials not configured" };
    }

    try {
      const res = await fetch(`${apiUrl}/api/v1/invoice/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ invoiceNumber, reason }),
      });

      const result = await res.json();
      return {
        success: result.code === "0000" || result.success,
        error: result.message,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Void failed" };
    }
  },
};
