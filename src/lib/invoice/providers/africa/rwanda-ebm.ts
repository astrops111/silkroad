import type { InvoiceProvider, InvoiceData, InvoiceIssueResult } from "../../types";

/**
 * Rwanda EBM (Electronic Billing Machine) — RRA
 * Mandatory for VAT-registered businesses in Rwanda.
 * Invoices must be reported to RRA via the EBM V2 / VSDC API.
 */
export const rwandaEbmProvider: InvoiceProvider = {
  name: "rwanda_ebm",
  supportedCountries: ["RW"],

  async issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult> {
    const apiUrl = process.env.RRA_EBM_API_URL;
    const apiKey = process.env.RRA_EBM_API_KEY;
    const sdcId = process.env.RRA_EBM_SDC_ID;

    if (!apiUrl || !apiKey || !sdcId) {
      return {
        success: false,
        error: "RRA EBM credentials not configured. Set RRA_EBM_API_URL, RRA_EBM_API_KEY, RRA_EBM_SDC_ID.",
      };
    }

    const payload = {
      tin: data.issuerTaxId || "",
      bhfId: "00", // branch
      sarTyCd: "01", // invoice
      custTin: data.recipientTaxId || "",
      custNm: data.recipientName,
      remark: data.notes || "",
      totItemCnt: data.lineItems.length,
      taxblAmtA: (data.subtotal / 100).toFixed(2),
      taxAmtA: (data.taxAmount / 100).toFixed(2),
      totTaxblAmt: (data.subtotal / 100).toFixed(2),
      totTaxAmt: (data.taxAmount / 100).toFixed(2),
      totAmt: (data.totalAmount / 100).toFixed(2),
      prchrAcptcYn: "N",
      curCd: data.currency,
      salesTyCd: "N",
      rcptTyCd: "S", // Sales
      pmtTyCd: "01", // Cash
      salesSttsCd: "02", // Approved
      itemList: data.lineItems.map((item, idx) => ({
        itemSeq: idx + 1,
        itemCd: item.hsCode || `SR${idx + 1}`,
        itemNm: item.name,
        qty: item.quantity,
        prc: (item.unitPrice / 100).toFixed(2),
        splyAmt: (item.amount / 100).toFixed(2),
        taxblAmt: ((item.amount - item.taxAmount) / 100).toFixed(2),
        taxAmt: (item.taxAmount / 100).toFixed(2),
        totAmt: (item.amount / 100).toFixed(2),
        taxTyCd: "A", // VAT 18%
      })),
    };

    try {
      const res = await fetch(`${apiUrl}/trnsSalesSaveWr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey,
          "tin": data.issuerTaxId || "",
          "bhfId": "00",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.resultCd === "000") {
        return {
          success: true,
          invoiceNumber: result.data?.intrlData || `RW-${Date.now().toString(36)}`,
          externalReference: result.data?.sdcId,
          rawResponse: result,
        };
      }

      return {
        success: false,
        error: result.resultMsg || "EBM API error",
        rawResponse: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "EBM connection failed",
      };
    }
  },

  async voidInvoice(invoiceNumber: string, reason: string) {
    return { success: false, error: "EBM void requires credit note — not yet implemented" };
  },
};
