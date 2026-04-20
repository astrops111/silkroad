import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isUnauthorized } from "@/lib/auth/require-auth";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { generatePricingRecommendation } from "@/lib/ai/pricing-engine";

/**
 * POST /api/supplier/pricing-suggest
 * Generate AI pricing recommendations for a product.
 *
 * Body: { productName, productDescription, category, costPrice?, currentPrice?,
 *         currency, originCountry, targetMarkets, moq, competitorPrices? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isUnauthorized(auth)) return auth;

  const blocked = await requireAIFeature("ai_pricing_engine");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      productName,
      productDescription,
      category,
      costPrice,
      currentPrice,
      currency = "USD",
      originCountry = "CN",
      targetMarkets = ["KE", "NG", "GH", "ZA", "UG", "TZ"],
      moq = 100,
      competitorPrices,
    } = body;

    if (!productName || !productDescription) {
      return NextResponse.json(
        { error: "productName and productDescription are required" },
        { status: 400 }
      );
    }

    const result = await generatePricingRecommendation({
      productName,
      productDescription,
      category: category || "consumer_goods",
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
      currency,
      originCountry,
      targetMarkets,
      moq: parseInt(moq) || 100,
      competitorPrices,
    });

    return NextResponse.json({ success: true, pricing: result });
  } catch (error) {
    console.error("Pricing recommendation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate pricing",
      },
      { status: 500 }
    );
  }
}
