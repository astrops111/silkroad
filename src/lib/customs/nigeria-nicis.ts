// Nigeria NICIS2 (Nigeria Integrated Customs Information System)
//
// Lodges a Single Goods Declaration (SGD) with the Nigeria Customs Service
// via their NICIS2 REST API. All commercial imports into Nigeria require an
// SGD lodged through an approved customs agent before cargo release.
//
// Required env vars:
//   NIGERIA_NICIS_API_URL    — NICIS2 endpoint base
//   NIGERIA_NICIS_API_KEY    — NCS-issued system API key
//   NIGERIA_NICIS_AGENT_CODE — customs agent licence number (platform's)

export interface NicisDeclarationInput {
  importerTin: string;          // Nigeria TIN of the buyer company
  importerName: string;
  importerAddress: string;
  importerCity: string;

  billOfLading?: string;
  containerNumbers?: string[];
  portOfEntry: string;          // NCS port code e.g. "NGAPP" (Apapa)
  portOfOrigin: string;         // origin port UN/LOCODE
  shippingMethod: string;
  vesselName?: string;
  arrivalDate?: string;         // ISO date YYYY-MM-DD

  hsCodes: string[];
  goodsDescription: string;
  grossWeightKg: number;
  packageCount: number;
  cifValueUsd: number;          // whole dollars
  currency: string;

  supplierOrderId: string;
  shipmentId?: string;
}

export interface NicisDeclarationResult {
  success: boolean;
  declarationRef?: string;      // SGD reference e.g. "SGD/LGS/2026/001234"
  sadRef?: string;              // Single Administrative Document number
  rawResponse?: unknown;
  error?: string;
}

export async function submitNigeriaSGD(
  input: NicisDeclarationInput,
): Promise<NicisDeclarationResult> {
  const apiUrl = process.env.NIGERIA_NICIS_API_URL;
  const apiKey = process.env.NIGERIA_NICIS_API_KEY;
  const agentCode = process.env.NIGERIA_NICIS_AGENT_CODE;

  if (!apiUrl || !apiKey || !agentCode) {
    return {
      success: false,
      error:
        "Nigeria NICIS2 not configured. Set NIGERIA_NICIS_API_URL, NIGERIA_NICIS_API_KEY, NIGERIA_NICIS_AGENT_CODE.",
    };
  }

  const payload = {
    agentCode,
    declarationType: "IM4",    // IM4 = home use / outright importation
    importer: {
      tin: input.importerTin,
      name: input.importerName,
      address: input.importerAddress,
      city: input.importerCity,
      country: "NG",
    },
    transport: {
      modeCode: shippingMethodToNicisMode(input.shippingMethod),
      portOfEntry: input.portOfEntry,
      portOfLoading: input.portOfOrigin,
      vesselName: input.vesselName ?? "",
      blNumber: input.billOfLading ?? "",
      containers: input.containerNumbers ?? [],
      expectedArrival: input.arrivalDate ?? "",
    },
    items: input.hsCodes.map((hs, idx) => ({
      itemNumber: idx + 1,
      hsCode: hs,
      description: input.goodsDescription,
      grossWeightKg: input.grossWeightKg,
      packages: input.packageCount,
      cifValueUsd: input.cifValueUsd,
      currency: input.currency,
    })),
    externalRef: input.shipmentId ?? input.supplierOrderId,
  };

  try {
    const response = await fetch(`${apiUrl}/sgd/lodge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Agent-Code": agentCode,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    const body = await response.json().catch(() => ({ error: "Non-JSON response" }));

    if (!response.ok) {
      return {
        success: false,
        error: `NICIS2 HTTP ${response.status}: ${body?.message ?? body?.error ?? "Unknown error"}`,
        rawResponse: body,
      };
    }

    return {
      success: true,
      declarationRef: body.sgdReference ?? body.declarationRef,
      sadRef: body.sadNumber ?? undefined,
      rawResponse: body,
    };
  } catch (err) {
    return {
      success: false,
      error: `Nigeria NICIS2 request failed: ${(err as Error).message}`,
    };
  }
}

function shippingMethodToNicisMode(method: string): string {
  if (method.startsWith("sea"))  return "1"; // Sea
  if (method.startsWith("air"))  return "4"; // Air
  if (method.startsWith("road")) return "6"; // Road
  return "1";
}
