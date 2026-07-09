import { NextRequest, NextResponse } from "next/server";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { classifyHsCode } from "@/lib/ai/hs-classifier";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/ai/hs-classify — AI-powered HS code classification for a product
 * Body: { productName, description, category?, originCountry? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocked = await requireAIFeature("ai_hs_classifier");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const { productName, description, category, originCountry } = await request.json();

    if (!productName || !description) {
      return NextResponse.json(
        { error: "productName and description are required" },
        { status: 400 }
      );
    }

    const result = await classifyHsCode({
      productName,
      description,
      category,
      originCountry,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("HS classification error:", error);
    return NextResponse.json({ error: "HS classification failed" }, { status: 500 });
  }
}
