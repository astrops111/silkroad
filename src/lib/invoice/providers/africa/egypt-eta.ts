import type { InvoiceProvider, InvoiceData, InvoiceIssueResult } from "../../types";

/**
 * Egypt ETA (Electronic Tax Authority) — e-Invoice
 * Mandatory for all registered businesses in Egypt.
 * Uses ETA SDK / API with digital signatures.
 */
export const egyptEtaProvider: InvoiceProvider = {
  name: "egypt_eta",
  supportedCountries: ["EG"],

  async issueInvoice(data: InvoiceData): Promise<InvoiceIssueResult> {
    const clientId = process.env.ETA_CLIENT_ID;
    const clientSecret = process.env.ETA_CLIENT_SECRET;
    const apiUrl = process.env.ETA_API_URL || "https://api.invoicing.eta.gov.eg";

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: "ETA credentials not configured. Set ETA_CLIENT_ID, ETA_CLIENT_SECRET.",
      };
    }

    // 1. Authenticate
    let accessToken: string;
    try {
      const authRes = await fetch(`${apiUrl}/connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "InvoicingAPI",
        }),
      });
      const authData = await authRes.json();
      accessToken = authData.access_token;
      if (!accessToken) {
        return { success: false, error: "ETA authentication failed" };
      }
    } catch (err) {
      return { success: false, error: "ETA auth connection failed" };
    }

    // 2. Submit invoice
    const document = {
      issuer: {
        type: "B", // Business
        id: data.issuerTaxId || "",
        name: data.issuerName,
        address: {
          country: "EG",
          regionCity: data.issuerAddress || "Cairo",
        },
      },
      receiver: {
        type: data.recipientTaxId ? "B" : "P",
        id: data.recipientTaxId || "",
        name: data.recipientName,
        address: {
          country: data.recipientCountry || "EG",
          regionCity: data.recipientAddress || "",
        },
      },
      documentType: "I", // Invoice
      documentTypeVersion: "1.0",
      dateTimeIssued: new Date(data.invoiceDate).toISOString(),
      taxpayerActivityCode: "4620", // Wholesale trade
      internalID: data.orderNumber || `SR-${Date.now()}`,
      invoiceLines: data.lineItems.map((item) => ({
        description: item.name,
        itemType: "GS1",
        itemCode: item.hsCode || "10001556",
        unitType: "EA",
        quantity: item.quantity,
        unitValue: {
          currencySold: data.currency === "EGP" ? "EGP" : "USD",
          amountEGP: item.unitPrice / 100,
        },
        salesTotal: item.amount / 100,
        netTotal: (item.amount - item.taxAmount) / 100,
        total: item.amount / 100,
        taxableItems: [
          {
            taxType: "T1", // VAT
            amount: item.taxAmount / 100,
            subType: "V009", // 14% standard VAT
            rate: 14,
          },
        ],
      })),
      totalSalesAmount: data.subtotal / 100,
      totalDiscountAmount: 0,
      netAmount: (data.subtotal - data.taxAmount) / 100,
      totalAmount: data.totalAmount / 100,
      taxTotals: [{ taxType: "T1", amount: data.taxAmount / 100 }],
    };

    try {
      const res = await fetch(`${apiUrl}/api/v1/documentsubmissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ documents: [document] }),
      });

      const result = await res.json();

      if (result.acceptedDocuments?.length > 0) {
        const accepted = result.acceptedDocuments[0];
        return {
          success: true,
          invoiceNumber: accepted.internalId,
          externalReference: accepted.uuid,
          rawResponse: result,
        };
      }

      const rejection = result.rejectedDocuments?.[0];
      return {
        success: false,
        error: rejection?.error?.message || "ETA submission rejected",
        rawResponse: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "ETA API error",
      };
    }
  },

  async voidInvoice(invoiceNumber: string, reason: string) {
    return { success: false, error: "ETA void requires cancellation request — not yet implemented" };
  },
};
