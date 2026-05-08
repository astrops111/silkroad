// Kenya iCMS (Integrated Customs Management System) — KRA
//
// Submits an Import Declaration Form (IDF) electronically to the Kenya
// Revenue Authority customs portal. The IDF is the mandatory pre-arrival
// document for all commercial imports into Kenya.
//
// Required env vars:
//   KENYA_ICMS_API_URL  — KRA TradaNet endpoint base
//   KENYA_ICMS_API_KEY  — issued by KRA during onboarding
//   KENYA_ICMS_PIN      — platform's importer KRA PIN

export interface IcmsDeclarationInput {
  importerPin: string;          // KRA PIN of the buyer company
  importerName: string;
  importerAddress: string;

  billOfLading?: string;
  containerNumbers?: string[];
  portOfEntry: string;          // UN/LOCODE e.g. "KEMBA"
  portOfOrigin: string;         // e.g. "CNSHA"
  shippingMethod: string;
  carrierName?: string;
  arrivalDate?: string;         // ISO date YYYY-MM-DD

  hsCodes: string[];
  goodsDescription: string;
  grossWeightKg: number;
  packageCount: number;
  cifValueUsd: number;          // whole dollars (not minor units)
  currency: string;

  supplierOrderId: string;
  shipmentId?: string;
}

export interface IcmsDeclarationResult {
  success: boolean;
  declarationRef?: string;      // KRA IDF number e.g. "IDF/2026/0001234"
  assessmentRef?: string;       // customs entry number after lodgement
  rawResponse?: unknown;
  error?: string;
}

export async function submitKenyaIDF(
  input: IcmsDeclarationInput,
): Promise<IcmsDeclarationResult> {
  const apiUrl = process.env.KENYA_ICMS_API_URL;
  const apiKey = process.env.KENYA_ICMS_API_KEY;
  const platformPin = process.env.KENYA_ICMS_PIN;

  if (!apiUrl || !apiKey || !platformPin) {
    return {
      success: false,
      error:
        "Kenya iCMS not configured. Set KENYA_ICMS_API_URL, KENYA_ICMS_API_KEY, KENYA_ICMS_PIN.",
    };
  }

  const payload = {
    declarantPin: platformPin,
    importerPin: input.importerPin,
    importerName: input.importerName,
    importerAddress: input.importerAddress,
    modeOfTransport: shippingMethodToIcmsMode(input.shippingMethod),
    portOfEntry: input.portOfEntry,
    portOfLoading: input.portOfOrigin,
    carrierName: input.carrierName ?? "",
    billOfLadingNo: input.billOfLading ?? "",
    containerNos: input.containerNumbers ?? [],
    expectedArrivalDate: input.arrivalDate ?? "",
    commodities: input.hsCodes.map((hs) => ({
      hsCode: hs,
      description: input.goodsDescription,
      grossWeightKg: input.grossWeightKg,
      numberOfPackages: input.packageCount,
      cifValueUsd: input.cifValueUsd,
      currency: input.currency,
    })),
    externalReference: input.shipmentId ?? input.supplierOrderId,
  };

  try {
    const response = await fetch(`${apiUrl}/idf/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-KRA-Pin": platformPin,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    const body = await response.json().catch(() => ({ error: "Non-JSON response" }));

    if (!response.ok) {
      return {
        success: false,
        error: `iCMS HTTP ${response.status}: ${body?.message ?? body?.error ?? "Unknown error"}`,
        rawResponse: body,
      };
    }

    return {
      success: true,
      declarationRef: body.idfNumber ?? body.declarationNo,
      assessmentRef: body.entryNumber ?? undefined,
      rawResponse: body,
    };
  } catch (err) {
    return {
      success: false,
      error: `Kenya iCMS request failed: ${(err as Error).message}`,
    };
  }
}

function shippingMethodToIcmsMode(method: string): string {
  if (method.startsWith("sea"))  return "1"; // Sea
  if (method.startsWith("air"))  return "4"; // Air
  if (method.startsWith("road")) return "3"; // Road
  return "1";
}
