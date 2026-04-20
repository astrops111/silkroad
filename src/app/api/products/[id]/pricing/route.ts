import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/products/[id]/pricing — Get volume pricing tiers for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tiers, error } = await supabase
    .from("product_pricing_tiers")
    .select("id, min_quantity, max_quantity, unit_price, currency")
    .eq("product_id", id)
    .order("min_quantity", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get base product price for reference
  const { data: product } = await supabase
    .from("products")
    .select("base_price, currency, moq")
    .eq("id", id)
    .single();

  return NextResponse.json({
    productId: id,
    basePrice: product?.base_price || 0,
    baseCurrency: product?.currency || "USD",
    moq: product?.moq || 1,
    tiers: tiers || [],
  });
}

/**
 * POST /api/products/[id]/pricing — Create/update volume pricing tiers (supplier)
 * Body: { tiers: [{ minQuantity, maxQuantity?, unitPrice }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tiers } = await request.json();
  if (!tiers || !Array.isArray(tiers)) {
    return NextResponse.json({ error: "tiers array required" }, { status: 400 });
  }

  // Verify product belongs to supplier
  const { data: product } = await supabase
    .from("products")
    .select("supplier_id, currency")
    .eq("id", id)
    .single();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Delete existing tiers
  await supabase.from("product_pricing_tiers").delete().eq("product_id", id);

  // Insert new tiers
  if (tiers.length > 0) {
    const rows = tiers.map((t: { minQuantity: number; maxQuantity?: number; unitPrice: number }) => ({
      product_id: id,
      min_quantity: t.minQuantity,
      max_quantity: t.maxQuantity || null,
      unit_price: t.unitPrice,
      currency: product.currency,
    }));

    const { error } = await supabase.from("product_pricing_tiers").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, productId: id, tierCount: tiers.length });
}
