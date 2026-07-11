import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { recommendForProduct, recommendForBuyer } from "@/lib/ai/product-recommender";
import { logError } from "@/lib/logging/activity";

/**
 * GET /api/ai/recommendations
 *   ?productId=<uuid>  — related products (public catalog data)
 *   ?forMe=true        — personalized picks for the signed-in buyer
 * Gated by the 'product_recommendations' feature flag.
 */
export async function GET(request: NextRequest) {
  const gateError = await requireAIFeature("product_recommendations");
  if (gateError) {
    return NextResponse.json({ error: gateError }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const productId = searchParams.get("productId");
  const forMe = searchParams.get("forMe") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "8", 10), 20);

  try {
    if (productId) {
      const recommendations = await recommendForProduct(productId, limit);
      return NextResponse.json({ recommendations });
    }

    if (forMe) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

      const recommendations = await recommendForBuyer(profile.id, limit);
      return NextResponse.json({ recommendations });
    }
  } catch (err) {
    console.error("[ai/recommendations]", err);
    await logError({
      errorCode: "ai_request_failed",
      message: err instanceof Error ? err.message : String(err),
      source: "ai-recommendations",
      metadata: { productId, forMe },
    }).catch(() => {});
    return NextResponse.json({ error: "Recommendations unavailable" }, { status: 502 });
  }

  return NextResponse.json({ error: "productId or forMe=true required" }, { status: 400 });
}
