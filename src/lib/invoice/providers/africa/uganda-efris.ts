import type { InvoiceProvider, InvoiceData, InvoiceIssueResult } from "../../types";

/**
 * Uganda EFRIS (Electronic Fiscal Receipting and Invoicing Solution) — URA
 * Mandatory for VAT-registered businesses in Uganda.
 * All invoices must be transmitted to URA via EFRIS API.
 */
export const ugandaEfrisProvider: InvoiceProvider = {
  name: "uganda_efris",
  supportedCountries: ["UG"],

  async issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult> {
    const apiUrl = process.env.EFRIS_API_URL;
    const apiKey = process.env.EFRIS_API_KEY;
    const deviceNo = process.env.EFRIS_DEVICE_NO;

    if (!apiUrl || !apiKey || !deviceNo) {
      return {
        success: false,
        error: "EFRIS credentials not configured. Set EFRIS_API_URL, EFRIS_API_KEY, EFRIS_DEVICE_NO.",
      };
    }

    const payload = {
      sellerDetails: {
        tin: data.issuerTaxId || "",
        ninBrn: "",
        legalName: data.issuerName,
        businessName: data.issuerName,
        address: data.issuerAddress || "",
        emailAddress: "",
        linePhone: "",
        referenceNo: data.orderNumber || "",
        deviceNo,
      },
      buyerDetails: {
        buyerTin: data.recipientTaxId || "",
        buyerLegalName: data.recipientName,
        buyerAddress: data.recipientAddress || "",
        buyerType: data.recipientTaxId ? "1" : "0", // 1=B2B, 0=B2C
      },
      goodsDetails: data.lineItems.map((item, idx) => ({
        item: item.name,
        itemCode: item.hsCode || "",
        qty: item.quantity.toString(),
        unitOfMeasure: "101", // each
        unitPrice: (item.unitPrice / 100).toFixed(2),
        total: (item.amount / 100).toFixed(2),
        taxRate: "0.18", // Uganda VAT is 18%
        tax: (item.taxAmount / 100).toFixed(2),
        orderNumber: String(idx + 1),
        discountTotal: "0",
        discountTaxRate: "0",
      })),
      summary: {
        netAmount: (data.subtotal / 100).toFixed(2),
        taxAmount: (data.taxAmount / 100).toFixed(2),
        grossAmount: (data.totalAmount / 100).toFixed(2),
        itemCount: String(data.lineItems.length),
        currency: data.currency,
        invoiceType: "1", // 1=normal
        invoiceIndustryCode: "101",
        dataSource: "103", // API
      },
      payWay: [{ paymentMode: "102", paymentAmount: (data.totalAmount / 100).toFixed(2) }],
      extend: { reason: "", reasonCode: "" },
    };

    try {
      const res = await fetch(`${apiUrl}/efris/ws/taapp/getInformation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          interfaceCode: "T109",
          content: JSON.stringify(payload),
          dataExchangeId: `SR-${Date.now()}`,
        }),
      });

      const result = await res.json();

      if (result.returnStateInfo?.returnCode === "00") {
        const content = JSON.parse(result.data?.content || "{}");
        return {
          success: true,
          invoiceNumber: content.invoiceNo,
          externalReference: content.fiscalCode,
          rawResponse: result,
        };
      }

      return {
        success: false,
        error: result.returnStateInfo?.returnMessage || "EFRIS API error",
        rawResponse: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "EFRIS connection failed",
      };
    }
  },

  async voidInvoice(invoiceNumber: string, reason: string) {
    // EFRIS credit note flow
    return { success: false, error: "EFRIS void not yet implemented — issue credit note instead" };
  },
};
