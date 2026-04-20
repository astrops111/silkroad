import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// AI Pricing Recommendation Engine
// ============================================================

// Purchasing power parity multipliers relative to USD
// Used to adjust pricing suggestions for regional markets
const PPP_MULTIPLIERS: Record<string, number> = {
  // East Africa
  KE: 0.38, // Kenya
  UG: 0.32, // Uganda
  TZ: 0.30, // Tanzania
  RW: 0.35, // Rwanda
  ET: 0.25, // Ethiopia
  // West Africa
  NG: 0.35, // Nigeria
  GH: 0.33, // Ghana
  SN: 0.30, // Senegal
  CI: 0.31, // Ivory Coast
  // Southern Africa
  ZA: 0.55, // South Africa
  ZM: 0.28, // Zambia
  ZW: 0.22, // Zimbabwe
  // North Africa
  EG: 0.32, // Egypt
  MA: 0.42, // Morocco
  // China (supplier side)
  CN: 0.50,
  // Global reference
  US: 1.0,
  GB: 0.95,
  EU: 0.90,
};

// B2B margin benchmarks by category
const CATEGORY_MARGINS: Record<string, { low: number; mid: number; high: number }> = {
  electronics: { low: 0.08, mid: 0.15, high: 0.25 },
  machinery: { low: 0.10, mid: 0.20, high: 0.35 },
  textiles: { low: 0.15, mid: 0.30, high: 0.50 },
  construction: { low: 0.08, mid: 0.18, high: 0.30 },
  agriculture: { low: 0.10, mid: 0.25, high: 0.45 },
  minerals: { low: 0.05, mid: 0.12, high: 0.20 },
  energy: { low: 0.10, mid: 0.20, high: 0.30 },
  consumer_goods: { low: 0.20, mid: 0.40, high: 0.60 },
  automotive: { low: 0.08, mid: 0.15, high: 0.25 },
  chemicals: { low: 0.10, mid: 0.22, high: 0.35 },
};

export interface PricingInput {
  productName: string;
  productDescription: string;
  category: string;
  costPrice?: number; // supplier's cost per unit (if known)
  currentPrice?: number; // current listing price
  currency: string;
  originCountry: string;
  targetMarkets: string[]; // country codes
  moq: number;
  competitorPrices?: { name: string; price: number; currency: string }[];
}

export interface PricingTierSuggestion {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  discount: string;
}

export interface RegionalPrice {
  country: string;
  countryName: string;
  suggestedPrice: number;
  currency: string;
  pppAdjusted: boolean;
  localCurrencyPrice: number | null;
  localCurrency: string | null;
}

export interface PricingRecommendation {
  suggestedBasePrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  currency: string;
  confidence: "high" | "medium" | "low";
  pricingStrategy: string;
  strategyExplanation: string;
  volumeTiers: PricingTierSuggestion[];
  regionalPricing: RegionalPrice[];
  marginAnalysis: {
    estimatedMarginPct: number;
    industryAvgMarginPct: number;
    recommendation: string;
  };
  competitivePosition: string;
  insights: string[];
}

// Country name lookup
const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya", UG: "Uganda", TZ: "Tanzania", RW: "Rwanda", ET: "Ethiopia",
  NG: "Nigeria", GH: "Ghana", SN: "Senegal", CI: "Ivory Coast",
  ZA: "South Africa", ZM: "Zambia", ZW: "Zimbabwe",
  EG: "Egypt", MA: "Morocco", CN: "China",
  US: "United States", GB: "United Kingdom",
};

// Local currency mapping
const LOCAL_CURRENCIES: Record<string, string> = {
  KE: "KES", UG: "UGX", TZ: "TZS", RW: "RWF", ET: "ETB",
  NG: "NGN", GH: "GHS", SN: "XOF", CI: "XOF",
  ZA: "ZAR", ZM: "ZMW", ZW: "ZWL",
  EG: "EGP", MA: "MAD", CN: "CNY",
  US: "USD", GB: "GBP",
};

// Approximate exchange rates to USD
const EXCHANGE_RATES: Record<string, number> = {
  KES: 130, UGX: 3700, TZS: 2500, RWF: 1300, ETB: 57,
  NGN: 1600, GHS: 15, XOF: 610,
  ZAR: 18.5, ZMW: 27, ZWL: 14000,
  EGP: 50, MAD: 10, CNY: 7.2,
  USD: 1, GBP: 0.79, EUR: 0.92,
};

export async function generatePricingRecommendation(
  input: PricingInput
): Promise<PricingRecommendation> {
  const client = new Anthropic();

  const margins = CATEGORY_MARGINS[input.category] || CATEGORY_MARGINS.consumer_goods;

  const competitorInfo = input.competitorPrices?.length
    ? `\nKnown competitor prices:\n${input.competitorPrices.map((c) => `- ${c.name}: ${c.currency} ${c.price}`).join("\n")}`
    : "";

  const systemPrompt = `You are a B2B pricing strategist for Silk Road, an Africa-first wholesale marketplace.
You help suppliers set competitive prices considering:
- Africa's purchasing power parity (PPP)
- B2B wholesale volume dynamics
- Cross-border trade costs (tariffs, shipping, customs)
- Competitor positioning
- Category-specific margin norms

Industry margin benchmarks for ${input.category}:
- Low margin: ${(margins.low * 100).toFixed(0)}%
- Mid margin: ${(margins.mid * 100).toFixed(0)}%
- High margin: ${(margins.high * 100).toFixed(0)}%

RESPONSE FORMAT: Respond with ONLY valid JSON, no markdown.
{
  "suggestedBasePrice": 0.00,
  "priceRangeLow": 0.00,
  "priceRangeHigh": 0.00,
  "confidence": "high|medium|low",
  "pricingStrategy": "strategy name",
  "strategyExplanation": "2-3 sentences explaining the strategy",
  "volumeTiers": [
    { "minQty": 1, "maxQty": 49, "unitPrice": 0.00, "discount": "0%" },
    { "minQty": 50, "maxQty": 199, "unitPrice": 0.00, "discount": "5%" },
    { "minQty": 200, "maxQty": null, "unitPrice": 0.00, "discount": "12%" }
  ],
  "competitivePosition": "premium|competitive|value|economy",
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4"]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Analyze pricing for this B2B product and suggest optimal pricing:

Product: ${input.productName}
Description: ${input.productDescription}
Category: ${input.category}
Origin: ${COUNTRY_NAMES[input.originCountry] || input.originCountry}
Currency: ${input.currency}
MOQ: ${input.moq} units
${input.costPrice ? `Supplier cost: ${input.currency} ${input.costPrice}` : "Cost not disclosed"}
${input.currentPrice ? `Current listed price: ${input.currency} ${input.currentPrice}` : "No current price"}
Target markets: ${input.targetMarkets.map((c) => COUNTRY_NAMES[c] || c).join(", ")}
${competitorInfo}

Suggest a base price in ${input.currency}, volume tiers, and competitive positioning.
Respond with ONLY JSON.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // Generate regional pricing with PPP adjustments
  const regionalPricing: RegionalPrice[] = input.targetMarkets.map((country) => {
    const ppp = PPP_MULTIPLIERS[country] || 0.5;
    const basePrice = parsed.suggestedBasePrice || input.currentPrice || 0;
    const adjustedPrice = Math.round(basePrice * ppp * 100) / 100;
    const localCurr = LOCAL_CURRENCIES[country];
    const exchRate = localCurr ? EXCHANGE_RATES[localCurr] || 1 : 1;

    return {
      country,
      countryName: COUNTRY_NAMES[country] || country,
      suggestedPrice: adjustedPrice,
      currency: input.currency,
      pppAdjusted: true,
      localCurrencyPrice: localCurr
        ? Math.round(adjustedPrice * exchRate * 100) / 100
        : null,
      localCurrency: localCurr || null,
    };
  });

  // Margin analysis
  const estimatedMargin = input.costPrice
    ? ((parsed.suggestedBasePrice - input.costPrice) / parsed.suggestedBasePrice) * 100
    : margins.mid * 100;

  return {
    suggestedBasePrice: parsed.suggestedBasePrice,
    priceRangeLow: parsed.priceRangeLow,
    priceRangeHigh: parsed.priceRangeHigh,
    currency: input.currency,
    confidence: parsed.confidence || "medium",
    pricingStrategy: parsed.pricingStrategy,
    strategyExplanation: parsed.strategyExplanation,
    volumeTiers: parsed.volumeTiers || [],
    regionalPricing,
    marginAnalysis: {
      estimatedMarginPct: Math.round(estimatedMargin * 100) / 100,
      industryAvgMarginPct: Math.round(margins.mid * 10000) / 100,
      recommendation:
        estimatedMargin < margins.low * 100
          ? "Your margin is below industry average. Consider raising prices or reducing costs."
          : estimatedMargin > margins.high * 100
            ? "Your margin is above industry average. You have room for competitive pricing."
            : "Your margin is within the healthy industry range.",
    },
    competitivePosition: parsed.competitivePosition || "competitive",
    insights: parsed.insights || [],
  };
}
