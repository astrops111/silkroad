import { aiText } from "@/lib/ai/nvidia";
import { normalizeHsCode } from "@/lib/logistics/tariffs/hs";

// ============================================================
// HS Code Classifier — product description → Harmonized System heading
// ============================================================
//
// Feeds the "classification" half of the tariff pipeline; the "duty rate"
// half is the tariff_rates lookup in landed-cost/providers/db-tariff.ts.
// Candidates are HS-6 (the level harmonized across all countries) — national
// tariff schedules extend it to 8/10 digits, which the model should not guess.

export interface HsClassificationInput {
  productName: string;
  description: string;
  category?: string;
  originCountry?: string; // ISO-2 — some headings are material/process-specific
}

export interface HsCodeCandidate {
  hsCode: string; // digits only, HS-6 (e.g. "610910") — matches tariff_rates.hs_prefix format
  heading: string; // official-style heading description
  confidencePct: number; // 0-100
  reasoning: string;
}

export interface HsClassificationResult {
  candidates: HsCodeCandidate[]; // ranked, most confident first, max 3
  recommendedHsCode: string | null; // top candidate's code once confidence clears the bar, else null
  notes: string;
}

const MIN_CONFIDENCE_FOR_RECOMMENDATION = 60;

export async function classifyHsCode(
  input: HsClassificationInput
): Promise<HsClassificationResult> {
  const systemPrompt = `You are a customs classification specialist trained on the World Customs
Organization Harmonized System (HS) nomenclature. Given a product name and
description, classify it under the correct 6-digit HS heading — the level
harmonized across all countries. Do not guess national 8/10-digit extensions.

RESPONSE FORMAT: Respond with ONLY valid JSON:
{
  "candidates": [
    {
      "hsCode": "610910",
      "heading": "T-shirts, singlets, other vests, knitted or crocheted, of cotton",
      "confidencePct": 85,
      "reasoning": "Why this heading fits, referencing material/construction/use"
    }
  ],
  "notes": "Any classification ambiguity, e.g. material blend or multi-use product"
}

RULES:
- Return up to 3 candidates, ranked most confident first.
- Base classification on material composition, function, and processing state — not brand or marketing language.
- If the product could plausibly fall under more than one heading (e.g. blended textiles, multi-function electronics), say so in "notes" and lower confidence accordingly.
- confidencePct reflects certainty about the HS-6 heading, not a guess at duty rates.
- Never invent a heading number — if unsure, prefer a chapter+heading you are confident of over a more specific but speculative one.`;

  const text = await aiText({
    system: systemPrompt,
    maxTokens: 1500,
    messages: [
      {
        role: "user",
        content: `Classify this product:

Name: ${input.productName}
Description: ${input.description}
Category: ${input.category || "Not specified"}
Origin: ${input.originCountry || "Not specified"}`,
      },
    ],
  });
  if (!text) {
    throw new Error("No response from HS classifier");
  }

  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidates: HsCodeCandidate[] = rawCandidates
    .map((c: { hsCode?: string; heading?: string; confidencePct?: number; reasoning?: string }) => ({
      hsCode: normalizeHsCode(String(c.hsCode ?? "")),
      heading: c.heading ?? "",
      confidencePct: typeof c.confidencePct === "number" ? c.confidencePct : 0,
      reasoning: c.reasoning ?? "",
    }))
    .filter((c: HsCodeCandidate) => c.hsCode.length >= 6)
    .sort((a: HsCodeCandidate, b: HsCodeCandidate) => b.confidencePct - a.confidencePct)
    .slice(0, 3);

  const top = candidates[0];
  const recommendedHsCode =
    top && top.confidencePct >= MIN_CONFIDENCE_FOR_RECOMMENDATION ? top.hsCode : null;

  return {
    candidates,
    recommendedHsCode,
    notes: parsed.notes ?? "",
  };
}
