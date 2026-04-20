import { NextRequest, NextResponse } from "next/server";
import { requireAIFeature } from "@/lib/ai/feature-flags";
import { scanCompliance } from "@/lib/ai/compliance-scanner";
import { requireAdmin, isAuthError } from "@/lib/auth/guard";

/**
 * POST /api/admin/compliance/scan — Scan product/transaction for regulatory compliance
 * Body: { productName, productDescription, category, hsCode?, originCountry, destinationCountry, valueUsd?, weight?, certifications? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const blocked = await requireAIFeature("ai_compliance_scanner");
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      productName,
      productDescription,
      category,
      hsCode,
      originCountry,
      destinationCountry,
      valueUsd,
      weight,
      certifications,
    } = body;

    if (!productName || !originCountry || !destinationCountry) {
      return NextResponse.json(
        { error: "productName, originCountry, and destinationCountry are required" },
        { status: 400 }
      );
    }

    const result = await scanCompliance({
      productName,
      productDescription: productDescription || "",
      category: category || "consumer_goods",
      hsCode,
      originCountry,
      destinationCountry,
      valueUsd: valueUsd ? parseFloat(valueUsd) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      certifications,
    });

    return NextResponse.json({ success: true, compliance: result });
  } catch (error) {
    console.error("Compliance scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compliance scan failed" },
      { status: 500 }
    );
  }
}
