"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductWithDetails } from "./products";
import { MARKETPLACE_COUNTRIES, isMarketplaceCountry } from "@/lib/countries";

interface SearchFilters {
  category?: string;
  categoryIds?: string[];
  originCountries?: string[];
  search?: string;
  priceMin?: number;
  priceMax?: number;
  moqMax?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  page?: number;
  limit?: number;
}

export async function searchProducts(filters: SearchFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  if (filters.originCountries && filters.originCountries.length > 0) {
    return searchProductsByOrigin(filters, page, limit, offset);
  }

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

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in("category_id", filters.categoryIds);
  } else if (filters.category) {
    query = query.eq("category_id", filters.category);
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

async function searchProductsByOrigin(
  filters: SearchFilters,
  page: number,
  limit: number,
  offset: number
) {
  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc("search_product_ids", {
    p_category_ids:
      filters.categoryIds && filters.categoryIds.length > 0
        ? filters.categoryIds
        : filters.category
        ? [filters.category]
        : null,
    p_origin_countries: filters.originCountries ?? null,
    p_search: filters.search ?? null,
    p_price_min: filters.priceMin !== undefined ? Math.round(filters.priceMin * 100) : null,
    p_price_max: filters.priceMax !== undefined ? Math.round(filters.priceMax * 100) : null,
    p_moq_max: filters.moqMax ?? null,
    p_sort: filters.sort ?? "newest",
    p_limit: limit,
    p_offset: offset,
  });

  if (rpcError) {
    return { products: [], total: 0, totalPages: 0, page, error: rpcError.message };
  }

  const rpcRows = (rpcData ?? []) as { id: string; total_count: number }[];
  const pageIds = rpcRows.map((row) => row.id);
  const total = rpcRows.length > 0 ? Number(rpcRows[0].total_count) : 0;

  if (pageIds.length === 0) {
    return { products: [], total: 0, totalPages: 0, page, error: undefined };
  }

  const { data: embedRows, error: embedError } = await supabase
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
    .in("id", pageIds);

  const orderIndex = new Map(pageIds.map((id, i) => [id, i]));
  const products = ((embedRows ?? []) as ProductWithDetails[]).sort(
    (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
  );

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit),
    page,
    error: embedError?.message,
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

export async function getCountryFacets(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const [{ data: origins }, { data: activeProducts }] = await Promise.all([
    supabase.from("products_with_origin").select("id, resolved_country"),
    supabase
      .from("products")
      .select("id")
      .eq("moderation_status", "approved")
      .eq("is_active", true),
  ]);

  const activeIds = new Set((activeProducts ?? []).map((p) => p.id));
  const counts: Record<string, number> = Object.fromEntries(
    MARKETPLACE_COUNTRIES.map((code) => [code, 0])
  );

  for (const row of origins ?? []) {
    if (!row.id || !activeIds.has(row.id)) continue;
    if (!isMarketplaceCountry(row.resolved_country)) continue;
    counts[row.resolved_country] = (counts[row.resolved_country] ?? 0) + 1;
  }

  return counts;
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
