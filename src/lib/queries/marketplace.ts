"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductWithDetails } from "./products";

interface SearchFilters {
  category?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  moqMax?: number;
  tradeAssurance?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  page?: number;
  limit?: number;
}

export async function searchProducts(filters: SearchFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_pricing_tiers (*),
      companies:supplier_id (id, name, slug, logo_url, verification_status, country_code)
    `,
      { count: "exact" }
    )
    .eq("moderation_status", "approved")
    .eq("is_active", true);

  if (filters.category) {
    query = query.eq("categories.slug", filters.category);
  }

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters.priceMin !== undefined) {
    query = query.gte("base_price", filters.priceMin * 100);
  }

  if (filters.priceMax !== undefined) {
    query = query.lte("base_price", filters.priceMax * 100);
  }

  if (filters.moqMax !== undefined) {
    query = query.lte("moq", filters.moqMax);
  }

  // Sorting
  switch (filters.sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "popular":
      query = query.order("is_featured", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  return {
    products: (data ?? []) as ProductWithDetails[],
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
    page,
    error: error?.message,
  };
}

export async function getProductDetail(productId: string) {
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
      companies:supplier_id (id, name, slug, logo_url, verification_status, country_code)
    `
    )
    .eq("id", productId)
    .single();

  return {
    product: data as ProductWithDetails | null,
    error: error?.message,
  };
}

export async function getFeaturedProducts(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_pricing_tiers (*),
      companies:supplier_id (id, name, slug, logo_url, verification_status, country_code)
    `
    )
    .eq("moderation_status", "approved")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ProductWithDetails[];
}
