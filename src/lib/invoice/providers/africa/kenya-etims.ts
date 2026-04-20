import type { InvoiceProvider, InvoiceData, InvoiceIssueResult } from "../../types";

/**
 * Kenya ETIMS (Electronic Tax Invoice Management System) — KRA
 * Mandatory for all VAT-registered businesses in Kenya since 2024.
 * All B2B invoices must be transmitted to KRA and receive a CU Invoice Number.
 */
export const kenyaEtimsProvider: InvoiceProvider = {
  name: "kenya_etims",
  supportedCountries: ["KE"],

  async issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult> {
    const apiUrl = process.env.ETIMS_API_URL;
    const apiKey = process.env.ETIMS_API_KEY;
    const deviceSerial = process.env.ETIMS_DEVICE_SERIAL;

    if (!apiUrl || !apiKey || !deviceSerial) {
      // Fall back to generic PDF if ETIMS not configured
      return {
        success: false,
        error: "ETIMS credentials not configured. Set ETIMS_API_URL, ETIMS_API_KEY, ETIMS_DEVICE_SERIAL.",
      };
    }

    // Map invoice data to ETIMS format
    const etimsPayload = {
      // Header
      invcNo: 0, // Auto-assigned by ETIMS
      orgInvcNo: 0,
      custTin: data.recipientTaxId || "",
      custNm: data.recipientName,
      rcptTyCd: data.recipientTaxId ? "S" : "B", // S=Sale, B=Buyer
      pmtTyCd: "01", // 01=Cash, 02=Credit, 03=Mixed
      cfmDt: formatEtimsDate(data.invoiceDate),
      salesDt: formatEtimsDate(data.invoiceDate),
      stockRlsDt: formatEtimsDate(data.invoiceDate),
      totItemCnt: data.lineItems.length,
      taxblAmtA: data.subtotal, // Taxable amount (rate A = 16%)
      taxblAmtB: 0,
      taxblAmtC: 0,
      taxblAmtD: 0,
      taxRtA: 16, // Standard rate 16%
      taxRtB: 0,
      taxRtC: 0,
      taxRtD: 0,
      taxAmtA: data.taxAmount,
      taxAmtB: 0,
      taxAmtC: 0,
      taxAmtD: 0,
      totTaxblAmt: data.subtotal,
      totTaxAmt: data.taxAmount,
      totAmt: data.totalAmount,
      remark: data.notes || "",

      // Line items
      itemList: data.lineItems.map((item, idx) => ({
        itemSeq: idx + 1,
        itemCd: item.hsCode || "KE1NTXU0000001", // Default item code
        itemClsCd: "5022110200", // Default classification
        itemNm: item.name,
        pkgUnitCd: "EA", // Each
        pkg: item.quantity,
        qtyUnitCd: "EA",
        qty: item.quantity,
        prc: item.unitPrice,
        splyAmt: item.amount,
        dcRt: 0,
        dcAmt: 0,
        taxblAmt: item.amount,
        taxTyCd: "A", // Tax type A = 16% VAT
        taxAmt: item.taxAmount,
        totAmt: item.amount + item.taxAmount,
      })),
    };

    try {
      const response = await fetch(`${apiUrl}/trnsSalesSaveWr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Device-Serial": deviceSerial,
        },
        body: JSON.stringify(etimsPayload),
      });

      const result = await response.json();

      if (result.resultCd === "000") {
        return {
          success: true,
          invoiceNumber: `KE-${result.data?.intrlData || ""}`,
          externalReference: result.data?.cuInvcNo?.toString(),
          rawResponse: result,
        };
      }

      return {
        success: false,
        error: `ETIMS error: ${result.resultMsg || "Unknown error"} (code: ${result.resultCd})`,
        rawResponse: result,
      };
    } catch (err) {
      return {
        success: false,
        error: `ETIMS API call failed: ${(err as Error).message}`,
      };
    }
  },

  async voidInvoice(invoiceNumber: string, reason: string) {
    const apiUrl = process.env.ETIMS_API_URL;
    const apiKey = process.env.ETIMS_API_KEY;

    if (!apiUrl || !apiKey) {
      return { success: false, error: "ETIMS credentials not configured" };
    }

    try {
      const response = await fetch(`${apiUrl}/trnsSalesCancelWr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          orgInvcNo: invoiceNumber,
          remark: reason,
        }),
      });

      const result = await response.json();
      return {
        success: result.resultCd === "000",
        error: result.resultCd !== "000" ? result.resultMsg : undefined,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
};

function formatEtimsDate(dateStr: string): string {
  // ETIMS expects YYYYMMDDHHMMSS format
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
