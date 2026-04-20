import { NextRequest, NextResponse } from "next/server";
import { calculateOrderTax } from "@/lib/tax";

/**
 * POST /api/tax/calculate — Calculate tax for a given order
 * Public endpoint (used by checkout to show tax preview)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { subtotal, currency, supplierCountry, buyerCountry, buyerTaxExempt } = body;

  if (!subtotal || !supplierCountry || !buyerCountry) {
    return NextResponse.json(
      { error: "Missing required fields: subtotal, supplierCountry, buyerCountry" },
      { status: 400 }
    );
  }

  const result = calculateOrderTax({
    subtotal,
    currency: currency || "USD",
    supplierCountry,
    buyerCountry,
    buyerTaxExempt,
  });

  return NextResponse.json(result);
}
