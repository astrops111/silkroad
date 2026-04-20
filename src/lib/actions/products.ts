"use server";

import { createClient } from "@/lib/supabase/server";
import { productSchema, type ProductInput } from "@/lib/validators/product";
import type { TradeTerm } from "@/lib/supabase/database.types";

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-", Math.random().toString(36).slice(2, 8));
}

export async function createProduct(
  supplierId: string,
  input: ProductInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const slug = slugify(parsed.data.name);

  const { data, error } = await supabase
    .from("products")
    .insert({
      supplier_id: supplierId,
      name: parsed.data.name,
      name_local: parsed.data.nameLocal ?? null,
      slug,
      description: parsed.data.description,
      category_id: parsed.data.categoryId,
      base_price: Math.round(parsed.data.basePrice * 100), // Convert to cents
      compare_price: parsed.data.comparePrice
        ? Math.round(parsed.data.comparePrice * 100)
        : null,
      currency: parsed.data.currency,
      moq: parsed.data.moq,
      lead_time_days: parsed.data.leadTimeDays ?? null,
      trade_term: parsed.data.tradeTerm as TradeTerm,
      sample_available: parsed.data.sampleAvailable,
      sample_price: parsed.data.samplePrice
        ? Math.round(parsed.data.samplePrice * 100)
        : null,
      sample_moq: parsed.data.sampleMoq ?? 1,
      weight_kg: parsed.data.weightKg ?? null,
      hs_code: parsed.data.hsCode ?? null,
      origin_country: parsed.data.originCountry ?? null,
      moderation_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { id: data.id } };
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput>
): Promise<ActionResult> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.nameLocal !== undefined) updateData.name_local = input.nameLocal;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
  if (input.basePrice !== undefined)
    updateData.base_price = Math.round(input.basePrice * 100);
  if (input.comparePrice !== undefined)
    updateData.compare_price = input.comparePrice
      ? Math.round(input.comparePrice * 100)
      : null;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.moq !== undefined) updateData.moq = input.moq;
  if (input.leadTimeDays !== undefined)
    updateData.lead_time_days = input.leadTimeDays;
  if (input.tradeTerm !== undefined) updateData.trade_term = input.tradeTerm;
  if (input.sampleAvailable !== undefined)
    updateData.sample_available = input.sampleAvailable;
  if (input.weightKg !== undefined) updateData.weight_kg = input.weightKg;
  if (input.hsCode !== undefined) updateData.hs_code = input.hsCode;
  if (input.originCountry !== undefined)
    updateData.origin_country = input.originCountry;

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function addProductImages(
  productId: string,
  images: { url: string; altText?: string; isPrimary?: boolean }[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const inserts = images.map((img, i) => ({
    product_id: productId,
    url: img.url,
    alt_text: img.altText ?? null,
    sort_order: i,
    is_primary: img.isPrimary ?? i === 0,
  }));

  const { error } = await supabase.from("product_images").insert(inserts);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function addPricingTiers(
  productId: string,
  tiers: { minQuantity: number; maxQuantity?: number; unitPrice: number; currency?: string }[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const inserts = tiers.map((tier) => ({
    product_id: productId,
    min_quantity: tier.minQuantity,
    max_quantity: tier.maxQuantity ?? null,
    unit_price: Math.round(tier.unitPrice * 100),
    currency: tier.currency ?? "USD",
  }));

  const { error } = await supabase
    .from("product_pricing_tiers")
    .insert(inserts);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function addProductVariants(
  productId: string,
  variants: { name: string; sku?: string; priceOverride?: number; stockQuantity?: number }[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const inserts = variants.map((v) => ({
    product_id: productId,
    name: v.name,
    sku: v.sku ?? null,
    price_override: v.priceOverride ? Math.round(v.priceOverride * 100) : null,
    stock_quantity: v.stockQuantity ?? 0,
  }));

  const { error } = await supabase.from("product_variants").insert(inserts);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
