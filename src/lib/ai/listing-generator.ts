import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// AI Listing Generator — Vision + Multilingual Product Descriptions
// ============================================================

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "zh-CN", name: "Simplified Chinese" },
  { code: "sw", name: "Swahili" },
  { code: "ar", name: "Arabic" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yoruba" },
  { code: "am", name: "Amharic" },
  { code: "zu", name: "Zulu" },
  { code: "pt", name: "Portuguese" },
  { code: "lg", name: "Luganda" },
  { code: "rw", name: "Kinyarwanda" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Platform product categories (must match seed data)
const CATEGORY_MAP: Record<string, string> = {
  "electronics": "11111111-0001-0000-0000-000000000000",
  "machinery": "11111111-0002-0000-0000-000000000000",
  "textiles": "11111111-0003-0000-0000-000000000000",
  "construction": "11111111-0004-0000-0000-000000000000",
  "agriculture": "11111111-0005-0000-0000-000000000000",
  "minerals": "11111111-0006-0000-0000-000000000000",
  "energy": "11111111-0007-0000-0000-000000000000",
  "consumer_goods": "11111111-0008-0000-0000-000000000000",
  "automotive": "11111111-0009-0000-0000-000000000000",
  "chemicals": "11111111-0010-0000-0000-000000000000",
};

export interface ListingGeneratorInput {
  imageBase64List: string[]; // base64-encoded product images
  imageMediaTypes: string[]; // MIME types
  sellerNotes?: string; // optional context from seller
  originCountry?: string; // where the product is from
  targetLanguages?: LanguageCode[]; // default: all 12
}

export interface GeneratedListing {
  // English primary
  name: string;
  description: string;
  shortDescription: string;
  specs: Record<string, string>;
  tags: string[];
  suggestedCategory: string;
  suggestedCategoryId: string | null;
  suggestedHsCode: string;
  suggestedTradeTerm: string;
  suggestedMoq: number;
  estimatedWeightKg: number | null;

  // Translations
  translations: Record<
    string,
    {
      name: string;
      description: string;
      shortDescription: string;
      tags: string[];
    }
  >;
}

export async function generateListing(
  input: ListingGeneratorInput
): Promise<GeneratedListing> {
  const client = new Anthropic();
  const targetLangs = input.targetLanguages || SUPPORTED_LANGUAGES.map((l) => l.code);
  const langList = SUPPORTED_LANGUAGES.filter((l) => targetLangs.includes(l.code))
    .map((l) => `${l.code} (${l.name})`)
    .join(", ");

  // Build image content blocks
  const imageBlocks: Anthropic.Messages.ImageBlockParam[] = input.imageBase64List.map(
    (b64, i) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: (input.imageMediaTypes[i] || "image/jpeg") as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: b64,
      },
    })
  );

  const systemPrompt = `You are a B2B product listing specialist for Silk Road, an Africa-first wholesale marketplace.
You analyze product photos and generate professional, SEO-optimized B2B product listings.

PLATFORM CATEGORIES (pick the best match):
- electronics, machinery, textiles, construction, agriculture, minerals, energy, consumer_goods, automotive, chemicals

TRADE TERMS: fob, cif, exw, ddp, dap

RESPONSE FORMAT: You MUST respond with ONLY valid JSON, no markdown fences, no explanation.
The JSON must follow this exact structure:
{
  "name": "Product Name (English, professional B2B style)",
  "description": "Detailed 150-250 word description for B2B buyers. Include materials, dimensions, applications, certifications, and use cases. Professional tone.",
  "shortDescription": "One-line summary under 120 characters",
  "specs": { "Material": "...", "Dimensions": "...", "Weight": "...", "Color": "...", "Certification": "...", ... },
  "tags": ["tag1", "tag2", ... up to 10 relevant B2B search tags],
  "suggestedCategory": "one of the platform categories listed above",
  "suggestedHsCode": "6-digit HS code for customs",
  "suggestedTradeTerm": "fob or cif or exw or ddp or dap",
  "suggestedMoq": 100,
  "estimatedWeightKg": 2.5,
  "translations": {
    "fr": { "name": "...", "description": "...", "shortDescription": "...", "tags": ["..."] },
    "zh-CN": { "name": "...", "description": "...", "shortDescription": "...", "tags": ["..."] },
    ... for each language
  }
}

IMPORTANT RULES:
- Descriptions should emphasize wholesale/B2B value: bulk availability, consistent quality, trade compliance
- Tags should be B2B search terms buyers would use
- HS codes should be real and accurate for Africa/China trade
- MOQ should be realistic for B2B wholesale
- Translations must be natural, not literal machine translations — use trade terminology native to each language/market
- For African languages (Swahili, Hausa, Yoruba, etc.), use common market/trade vocabulary`;

  const userContent: Anthropic.Messages.ContentBlockParam[] = [
    ...imageBlocks,
    {
      type: "text" as const,
      text: `Analyze these product photo(s) and generate a complete B2B listing.
${input.sellerNotes ? `\nSeller notes: ${input.sellerNotes}` : ""}
${input.originCountry ? `\nOrigin country: ${input.originCountry}` : ""}

Generate translations for these languages: ${langList}

Respond with ONLY the JSON object, no markdown.`,
    },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  // Extract text from response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Parse JSON — strip any accidental markdown fences
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  return {
    name: parsed.name,
    description: parsed.description,
    shortDescription: parsed.shortDescription,
    specs: parsed.specs || {},
    tags: parsed.tags || [],
    suggestedCategory: parsed.suggestedCategory,
    suggestedCategoryId: CATEGORY_MAP[parsed.suggestedCategory] || null,
    suggestedHsCode: parsed.suggestedHsCode || "",
    suggestedTradeTerm: parsed.suggestedTradeTerm || "fob",
    suggestedMoq: parsed.suggestedMoq || 100,
    estimatedWeightKg: parsed.estimatedWeightKg || null,
    translations: parsed.translations || {},
  };
}
