import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// Regulatory Compliance Scanner — Import/Export Violation Detection
// ============================================================

// Known restricted/sanctioned product categories by country pair
const RESTRICTED_ROUTES: Record<string, string[]> = {
  // Common Africa restrictions
  "NG_import": ["used electronics >5 years", "poultry products", "refined petroleum"],
  "KE_import": ["plastic bags <30 microns", "GMO food products without labels"],
  "GH_import": ["used mattresses", "used underwear", "right-hand-drive vehicles"],
  "ZA_import": ["asbestos products", "hazardous waste"],
  "ET_import": ["used clothing in bulk", "second-hand vehicles >8 years"],
  "RW_import": ["used clothing", "plastic bags"],
  "TZ_import": ["plastic bags", "raw ivory", "used tires"],

  // China export controls
  "CN_export": ["rare earth minerals (unlicensed)", "military technology", "encryption devices"],

  // CITES protected
  "global": ["ivory", "rhino horn", "pangolin scales", "tiger products", "rosewood (unregistered)"],
};

// ECOWAS free trade considerations
const ECOWAS_MEMBERS = ["BJ", "BF", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "ML", "NE", "NG", "SN", "SL", "TG"];
const EAC_MEMBERS = ["KE", "UG", "TZ", "RW", "BI", "SS", "CD"];
const SADC_MEMBERS = ["ZA", "ZW", "MZ", "MW", "ZM", "BW", "NA", "LS", "SZ", "AO", "CD", "TZ", "MU", "MG", "SC"];

export interface ComplianceScanInput {
  productName: string;
  productDescription: string;
  category: string;
  hsCode?: string;
  originCountry: string;
  destinationCountry: string;
  valueUsd?: number;
  weight?: number;
  certifications?: string[];
}

export interface ComplianceFlag {
  severity: "critical" | "warning" | "info";
  code: string;
  title: string;
  description: string;
  regulation: string;
  recommendation: string;
}

export interface ComplianceResult {
  status: "clear" | "flagged" | "blocked";
  flags: ComplianceFlag[];
  tradeAgreements: string[];
  requiredDocuments: string[];
  estimatedDutyPct: number | null;
  notes: string;
}

export async function scanCompliance(
  input: ComplianceScanInput
): Promise<ComplianceResult> {
  const client = new Anthropic();

  // Check trade blocs
  const tradeAgreements: string[] = [];
  const isEcowas = ECOWAS_MEMBERS.includes(input.originCountry) && ECOWAS_MEMBERS.includes(input.destinationCountry);
  const isEac = EAC_MEMBERS.includes(input.originCountry) && EAC_MEMBERS.includes(input.destinationCountry);
  const isSadc = SADC_MEMBERS.includes(input.originCountry) && SADC_MEMBERS.includes(input.destinationCountry);

  if (isEcowas) tradeAgreements.push("ECOWAS (Economic Community of West African States) — preferential tariffs");
  if (isEac) tradeAgreements.push("EAC (East African Community) — Common External Tariff applies");
  if (isSadc) tradeAgreements.push("SADC Free Trade Area — reduced/zero tariffs on qualifying goods");

  // AfCFTA (all African countries)
  const africanCodes = [...new Set([...ECOWAS_MEMBERS, ...EAC_MEMBERS, ...SADC_MEMBERS, "EG", "MA", "DZ", "TN", "LY", "ET", "CM", "GA", "CG", "CF"])];
  if (africanCodes.includes(input.originCountry) && africanCodes.includes(input.destinationCountry)) {
    tradeAgreements.push("AfCFTA (African Continental Free Trade Area) — tariff liberalization in progress");
  }

  const systemPrompt = `You are a trade compliance specialist for Silk Road Africa, an Africa-first B2B marketplace.
You assess whether products and transactions comply with import/export regulations.

TRADE CONTEXT:
- Primary trade corridors: China → Africa, intra-Africa
- Platform handles customs documentation and HS code classification
- Mobile money payments are the norm (not sanctioned per se)

KNOWN RESTRICTIONS FOR REFERENCE:
${Object.entries(RESTRICTED_ROUTES).map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n")}

APPLICABLE TRADE AGREEMENTS:
${tradeAgreements.length > 0 ? tradeAgreements.join("\n") : "None detected"}

RESPONSE FORMAT: Respond with ONLY valid JSON:
{
  "status": "clear|flagged|blocked",
  "flags": [
    {
      "severity": "critical|warning|info",
      "code": "SHORT_CODE",
      "title": "Flag title",
      "description": "What the issue is",
      "regulation": "Which regulation/law this relates to",
      "recommendation": "What the seller/buyer should do"
    }
  ],
  "requiredDocuments": ["doc 1", "doc 2"],
  "estimatedDutyPct": 15,
  "notes": "Brief overall compliance assessment"
}

RULES:
- CRITICAL flags = transaction should be blocked until resolved
- WARNING flags = transaction can proceed but needs attention
- INFO flags = advisory information
- Be specific about which country's regulation applies
- Include HS-code-specific duties when possible
- For China-Africa routes, flag common issues: undervaluation, mis-classification, counterfeit risk`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Scan this product/transaction for regulatory compliance:

Product: ${input.productName}
Description: ${input.productDescription}
Category: ${input.category}
HS Code: ${input.hsCode || "Not specified"}
Origin: ${input.originCountry}
Destination: ${input.destinationCountry}
Value: ${input.valueUsd ? `$${input.valueUsd}` : "Not specified"}
Weight: ${input.weight ? `${input.weight} kg` : "Not specified"}
Certifications: ${input.certifications?.join(", ") || "None listed"}

Check for:
1. Import restrictions in ${input.destinationCountry}
2. Export restrictions from ${input.originCountry}
3. Required documentation (certificates of origin, phytosanitary, etc.)
4. Estimated duty/tariff rates
5. Sanctions or embargoes
6. CITES or environmental restrictions
7. Product safety / standards compliance`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from compliance scanner");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  return {
    status: parsed.status,
    flags: parsed.flags || [],
    tradeAgreements,
    requiredDocuments: parsed.requiredDocuments || [],
    estimatedDutyPct: parsed.estimatedDutyPct ?? null,
    notes: parsed.notes || "",
  };
}
