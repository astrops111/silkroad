import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// AI RFQ Supplier Matching — Match RFQs to best-fit suppliers
// ============================================================

export interface RFQData {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  categoryName: string;
  quantity: number;
  unit: string;
  targetPrice: number | null;
  currency: string;
  deliveryCountry: string;
  deliveryCity: string;
  requiredBy: string | null;
  tradeTerm: string | null;
  specifications: Record<string, unknown>;
  certificationsRequired: string[];
  items: { productName: string; quantity: number; specifications: Record<string, unknown> }[];
}

export interface SupplierCandidate {
  companyId: string;
  companyName: string;
  country: string;
  tier: string;
  verificationStatus: string;
  rating: number;
  totalOrders: number;
  responseRate: number;
  onTimeDeliveryRate: number;
  productCategories: string[];
  products: { name: string; basePrice: number; currency: string; moq: number }[];
  certifications: string[];
}

export interface SupplierMatch {
  companyId: string;
  companyName: string;
  matchScore: number;
  matchReasons: string[];
  concerns: string[];
  estimatedUnitPrice: number | null;
  estimatedLeadTimeDays: number | null;
  tierBadge: string;
  recommended: boolean;
}

export interface RFQMatchResult {
  matches: SupplierMatch[];
  summary: string;
  totalCandidatesScanned: number;
  matchCriteria: string[];
}

export async function matchSuppliersToRFQ(
  rfq: RFQData,
  candidates: SupplierCandidate[]
): Promise<RFQMatchResult> {
  const client = new Anthropic();

  if (candidates.length === 0) {
    return {
      matches: [],
      summary: "No supplier candidates found in the platform for this RFQ category.",
      totalCandidatesScanned: 0,
      matchCriteria: [],
    };
  }

  const systemPrompt = `You are a B2B trade matching specialist for Silk Road, an Africa-first wholesale marketplace.
You match buyer RFQs to the most suitable supplier candidates based on:
1. Product category fit
2. Quantity capacity (MOQ vs requested quantity)
3. Price competitiveness (if target price given)
4. Supplier reliability (rating, on-time delivery, response rate)
5. Geographic proximity / trade corridor efficiency
6. Required certifications match
7. Supplier tier (verified > gold > standard > free)

RESPONSE FORMAT: Respond with ONLY valid JSON:
{
  "matches": [
    {
      "companyId": "uuid",
      "companyName": "name",
      "matchScore": 85,
      "matchReasons": ["reason 1", "reason 2"],
      "concerns": ["concern 1"],
      "estimatedUnitPrice": 12.50,
      "estimatedLeadTimeDays": 14,
      "recommended": true
    }
  ],
  "summary": "2-3 sentence summary of matching results",
  "matchCriteria": ["criteria 1", "criteria 2"]
}

RULES:
- Score 0-100, with 80+ being strong matches
- Return top 10 at most, ordered by score
- Mark top 3 as "recommended: true"
- Be honest about concerns (low ratings, no certifications, etc.)
- Consider Africa-specific logistics (cross-border costs, customs)`;

  const candidateSummaries = candidates.slice(0, 30).map((c) => ({
    id: c.companyId,
    name: c.companyName,
    country: c.country,
    tier: c.tier,
    verified: c.verificationStatus === "verified",
    rating: c.rating,
    orders: c.totalOrders,
    responseRate: c.responseRate,
    onTime: c.onTimeDeliveryRate,
    categories: c.productCategories.slice(0, 5),
    products: c.products.slice(0, 5).map((p) => `${p.name} ($${(p.basePrice / 100).toFixed(2)}/${p.currency}, MOQ:${p.moq})`),
    certs: c.certifications,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Match suppliers to this RFQ:

RFQ: ${rfq.title}
Description: ${rfq.description || "N/A"}
Category: ${rfq.categoryName}
Quantity: ${rfq.quantity} ${rfq.unit}
Target Price: ${rfq.targetPrice ? `${rfq.currency} ${(rfq.targetPrice / 100).toFixed(2)}` : "Not specified"}
Delivery: ${rfq.deliveryCity || ""}, ${rfq.deliveryCountry}
Required By: ${rfq.requiredBy || "Flexible"}
Trade Term: ${rfq.tradeTerm || "FOB"}
Certifications Required: ${rfq.certificationsRequired.join(", ") || "None"}
Items: ${rfq.items.map((i) => `${i.quantity}x ${i.productName}`).join("; ") || "See description"}
Specs: ${JSON.stringify(rfq.specifications)}

SUPPLIER CANDIDATES (${candidates.length} total, showing top ${candidateSummaries.length}):
${JSON.stringify(candidateSummaries, null, 1)}

Rank and score the best matches.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from RFQ matcher");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // Enrich with tier badges
  const enrichedMatches: SupplierMatch[] = (parsed.matches || []).map((m: SupplierMatch) => {
    const candidate = candidates.find((c) => c.companyId === m.companyId);
    return {
      ...m,
      tierBadge: candidate?.tier || "free",
    };
  });

  return {
    matches: enrichedMatches,
    summary: parsed.summary || "",
    totalCandidatesScanned: candidates.length,
    matchCriteria: parsed.matchCriteria || [],
  };
}
