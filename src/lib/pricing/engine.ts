"use server";

import { createClient } from "@/lib/supabase/server";

interface PricingResult {
  unitPrice: number; // in minor units (cents)
  tierLabel?: string;
  originalPrice: number;
  discount: number; // percentage
}

/**
 * Calculate the unit price for a product given a quantity.
 * Looks up product_pricing_tiers and returns the best matching tier.
 * Falls back to base_price if no tier matches.
 */
export async function calculateUnitPrice(
  productId: string,
  quantity: number
): Promise<PricingResult> {
  const supabase = await createClient();

  // Get base price
  const { data: product } = await supabase
    .from("products")
    .select("base_price, currency")
    .eq("id", productId)
    .single();

  if (!product) {
    return { unitPrice: 0, originalPrice: 0, discount: 0 };
  }

  const basePrice = product.base_price;

  // Get pricing tiers, ordered by min_quantity descending to find best match
  const { data: tiers } = await supabase
    .from("product_pricing_tiers")
    .select("min_quantity, max_quantity, unit_price")
    .eq("product_id", productId)
    .order("min_quantity", { ascending: true });

  if (!tiers || tiers.length === 0) {
    return { unitPrice: basePrice, originalPrice: basePrice, discount: 0 };
  }

  // Find the matching tier (highest min_quantity that the order quantity meets)
  let matchedTier = null;
  for (const tier of tiers) {
    if (quantity >= tier.min_quantity) {
      if (!tier.max_quantity || quantity <= tier.max_quantity) {
        matchedTier = tier;
      }
    }
  }

  if (!matchedTier) {
    return { unitPrice: basePrice, originalPrice: basePrice, discount: 0 };
  }

  const discount = basePrice > 0
    ? Math.round(((basePrice - matchedTier.unit_price) / basePrice) * 100)
    : 0;

  return {
    unitPrice: matchedTier.unit_price,
    tierLabel: `${matchedTier.min_quantity}${matchedTier.max_quantity ? `-${matchedTier.max_quantity}` : "+"} units`,
    originalPrice: basePrice,
    discount,
  };
}

/**
 * Get all pricing tiers for a product.
 * Returns them formatted for display.
 */
export async function getProductPricingTiers(productId: string) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("base_price, currency")
    .eq("id", productId)
    .single();

  const { data: tiers } = await supabase
    .from("product_pricing_tiers")
    .select("*")
    .eq("product_id", productId)
    .order("min_quantity", { ascending: true });

  if (!product) return [];

  return (tiers ?? []).map((tier) => ({
    id: tier.id,
    minQuantity: tier.min_quantity,
    maxQuantity: tier.max_quantity,
    unitPrice: tier.unit_price,
    currency: tier.currency,
    discount: product.base_price > 0
      ? Math.round(((product.base_price - tier.unit_price) / product.base_price) * 100)
      : 0,
  }));
}

/**
 * Calculate total for a list of cart items with tier pricing applied.
 * This is a server-side calculation for checkout validation.
 */
export async function calculateCartTotals(
  items: { productId: string; quantity: number; variantId?: string }[]
): Promise<{
  items: { productId: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
}> {
  const results = await Promise.all(
    items.map(async (item) => {
      const pricing = await calculateUnitPrice(item.productId, item.quantity);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: pricing.unitPrice,
        total: pricing.unitPrice * item.quantity,
      };
    })
  );

  const subtotal = results.reduce((sum, item) => sum + item.total, 0);
  return { items: results, subtotal };
}
