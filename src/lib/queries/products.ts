"use server";

import { createClient } from "@/lib/supabase/server";
import { idPrefixRange } from "@/lib/product-url";
import type { Tables } from "@/lib/supabase/database.types";

export type ProductWithDetails = Tables<"products"> & {
  categories: Tables<"categories"> | null;
  product_images: Tables<"product_images">[];
  product_variants: Tables<"product_variants">[];
  product_pricing_tiers: Tables<"product_pricing_tiers">[];
  product_certifications: Tables<"product_certifications">[];
  product_labels?: { labels: Pick<Tables<"labels">, "name" | "slug" | "kind"> | null }[];
  companies: Pick<Tables<"companies">, "id" | "name" | "slug" | "logo_url" | "verification_status" | "country_code"> | null;
};

/** Row shape for the supplier catalog table — only what that page renders. */
export type SupplierProductListRow = Pick<
  Tables<"products">,
  "id" | "name" | "brand" | "base_price" | "currency" | "moq" | "moderation_status" | "is_active"
> & {
  categories: Pick<Tables<"categories">, "id" | "name"> | null;
  product_images: Pick<Tables<"product_images">, "id" | "url" | "alt_text" | "is_primary">[];
  product_variants: Pick<Tables<"product_variants">, "id" | "stock_quantity">[];
};

export async function getSupplierProducts(
  companyId: string,
  options?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const supabase = await createClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  // Narrow projection: the supplier products table only renders these
  // columns (variants are summed for stock; pricing tiers are not shown).
  let query = supabase
    .from("products")
    .select(
      "id, name, brand, base_price, currency, moq, moderation_status, is_active, categories (id, name), product_images (id, url, alt_text, is_primary), product_variants (id, stock_quantity)",
      { count: "exact" }
    )
    .eq("supplier_id", companyId);

  if (options?.status) {
    query = query.eq("moderation_status", options.status);
  }

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, count, error } = await query
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  return {
    // category_id is a to-one FK, so PostgREST returns an object (or null) here;
    // the select-string type inference guesses an array, hence the unknown hop.
    products: (data ?? []) as unknown as SupplierProductListRow[],
    total: count ?? 0,
    error: error?.message,
  };
}

export async function getProductById(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_variants (*),
      product_pricing_tiers (*),
      product_certifications (*),
      product_labels ( labels (name, slug, kind) )
    `
    )
    .eq("id", productId)
    .single();

  return { product: data as ProductWithDetails | null, error: error?.message };
}

export async function getProductWithSupplier(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_variants (*),
      product_pricing_tiers (*),
      product_certifications (*),
      product_labels ( labels (name, slug, kind) ),
      companies:supplier_id (id, name, slug, logo_url, verification_status, country_code)
    `
    )
    .eq("id", productId)
    .single();

  return { product: data as ProductWithDetails | null, error: error?.message };
}

/**
 * Resolve a full product id from the short "xxxxxxxx-xxxx" prefix carried in the
 * SEO URL, using a UUID range scan (no assumption of unique slugs). Returns null
 * if nothing matches or — astronomically unlikely — the prefix is ambiguous.
 */
export async function resolveProductIdByPrefix(prefix: string): Promise<string | null> {
  const supabase = await createClient();
  const { low, high } = idPrefixRange(prefix);
  const { data } = await supabase
    .from("products")
    .select("id")
    .gte("id", low)
    .lte("id", high)
    .eq("is_active", true)
    .eq("moderation_status", "approved")
    .limit(2);
  if (!data || data.length !== 1) return null;
  return data[0].id as string;
}
