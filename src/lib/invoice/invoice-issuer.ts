import type { InvoiceData, InvoiceIssueResult, InvoiceProvider } from "./types";
import { genericPdfProvider } from "./providers/africa/generic-pdf";
import { kenyaEtimsProvider } from "./providers/africa/kenya-etims";
import { ugandaEfrisProvider } from "./providers/africa/uganda-efris";
import { rwandaEbmProvider } from "./providers/africa/rwanda-ebm";
import { egyptEtaProvider } from "./providers/africa/egypt-eta";
import { chinaFapiaoProvider } from "./providers/china/fapiao";

// Country → Provider mapping
// Countries with mandatory e-invoice get their specific provider
// All others get generic PDF
const COUNTRY_PROVIDERS: Record<string, InvoiceProvider> = {
  KE: kenyaEtimsProvider,
  UG: ugandaEfrisProvider,
  RW: rwandaEbmProvider,
  EG: egyptEtaProvider,
  CN: chinaFapiaoProvider,
};

/**
 * Issue an invoice, routing to the correct provider based on country.
 * Falls back to generic PDF for countries without mandatory e-invoice.
 */
export async function issueInvoice(
  data: InvoiceData
): Promise<InvoiceIssueResult> {
  const provider = getProvider(data.issuerCountry);

  try {
    const result = await provider.issueInvoice(data);

    // If country-specific provider fails, fall back to generic PDF
    if (!result.success && provider !== genericPdfProvider) {
      console.warn(
        `[invoice] ${provider.name} failed for ${data.issuerCountry}, falling back to PDF: ${result.error}`
      );
      return genericPdfProvider.issueInvoice(data);
    }

    return result;
  } catch (err) {
    console.error(`[invoice] Provider ${provider.name} threw:`, err);
    // Last resort fallback
    return genericPdfProvider.issueInvoice(data);
  }
}

/**
 * Void an invoice via the correct provider
 */
export async function voidInvoice(
  invoiceNumber: string,
  reason: string,
  country: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getProvider(country);
  return provider.voidInvoice(invoiceNumber, reason);
}

function getProvider(countryCode: string): InvoiceProvider {
  return COUNTRY_PROVIDERS[countryCode] || genericPdfProvider;
}

/**
 * Check if a country requires e-invoice integration
 */
export function requiresEInvoice(countryCode: string): boolean {
  return countryCode in COUNTRY_PROVIDERS;
}
