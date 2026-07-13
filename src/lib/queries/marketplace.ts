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
  brands?: string[];
  /** Restrict to one shipping group (MOA pool / groupage batch). Bypasses the
   *  origin RPC path — the group already pins the origin. */
  shippingGroupId?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "popular" | "name";
  page?: number;
  limit?: number;
}

export type ProductPoolingInfo = {
  pooling_group_type: string | null;
  group_moq: number | null;
  group_min_order_amount: number | null; // USD dollars (psg.min_order_amount)
  group_country_code: string | null;
};

/**
 * How each product's minimum order pools, keyed by product id.
 * Backed by the buyer-safe products_pooling_info view (00109) — group type
 * 'supplier'/'supplier_group' means one MOA across the supplier's listing;
 * 'country'/'custom' means groupage combined across suppliers.
 */
export async function getPoolingInfoByProductIds(
  productIds: string[]
): Promise<Record<string, ProductPoolingInfo>> {
  if (productIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products_pooling_info")
    .select("id, pooling_group_type, group_moq, group_min_order_amount, group_country_code")
    .in("id", productIds);
  if (error) {
    console.error("[marketplace] pooling info failed:", error);
    return {};
  }
  const map: Record<string, ProductPoolingInfo> = {};
  for (const r of data ?? []) {
    if (r.id) map[r.id] = r;
  }
  return map;
}

export type RegionPoolingRule = {
  poolingType: string; // 'supplier'|'supplier_group'|'country'|'custom'
  minAmount: number | null; // USD dollars
  products: number;
};

/**
 * Region-level MOA/groupage rules for the marketplace banner: for each origin
 * country that anchors an active shipping group, the pooling models in play
 * and their combined minimums. Aggregated from products_pooling_info.
 */
export async function getPoolingRulesByCountry(): Promise<Record<string, RegionPoolingRule[]>> {
  const supabase = await createClient();
  const rows = await fetchAllRows<{
    pooling_group_type: string | null;
    group_min_order_amount: number | null;
    group_country_code: string | null;
  }>((from, to) =>
    supabase
      .from("products_pooling_info")
      .select("pooling_group_type, group_min_order_amount, group_country_code")
      .range(from, to)
  );

  const byKey = new Map<string, { country: string } & RegionPoolingRule>();
  for (const r of rows) {
    if (!r.group_country_code || !r.pooling_group_type) continue;
    const key = `${r.group_country_code}::${r.pooling_group_type}`;
    let agg = byKey.get(key);
    if (!agg) {
      agg = { country: r.group_country_code, poolingType: r.pooling_group_type, minAmount: null, products: 0 };
      byKey.set(key, agg);
    }
    agg.products++;
    if (r.group_min_order_amount != null) {
      agg.minAmount = Math.max(agg.minAmount ?? 0, r.group_min_order_amount);
    }
  }

  const out: Record<string, RegionPoolingRule[]> = {};
  for (const a of byKey.values()) {
    (out[a.country] ??= []).push({ poolingType: a.poolingType, minAmount: a.minAmount, products: a.products });
  }
  return out;
}

export type ShippingGroupFacet = {
  id: string;
  name: string;
  poolingType: string;
  minAmount: number | null; // USD dollars
  products: number;
};

/**
 * Active shipping groups (MOA pools / groupage batches) per origin country,
 * for the marketplace sidebar's region sub-filters. Group names are
 * admin-chosen labels exposed via products_pooling_info (00110).
 */
export async function getShippingGroupFacets(): Promise<Record<string, ShippingGroupFacet[]>> {
  const supabase = await createClient();
  const rows = await fetchAllRows<{
    pooling_group_type: string | null;
    group_min_order_amount: number | null;
    group_country_code: string | null;
    group_id: string | null;
    group_name: string | null;
  }>((from, to) =>
    supabase
      .from("products_pooling_info")
      .select("pooling_group_type, group_min_order_amount, group_country_code, group_id, group_name")
      .range(from, to)
  );

  const byId = new Map<string, { country: string } & ShippingGroupFacet>();
  for (const r of rows) {
    if (!r.group_id || !r.group_country_code) continue;
    let agg = byId.get(r.group_id);
    if (!agg) {
      agg = {
        country: r.group_country_code,
        id: r.group_id,
        name: r.group_name ?? "Group",
        poolingType: r.pooling_group_type ?? "custom",
        minAmount: r.group_min_order_amount,
        products: 0,
      };
      byId.set(r.group_id, agg);
    }
    agg.products++;
  }

  const out: Record<string, ShippingGroupFacet[]> = {};
  for (const g of byId.values()) {
    (out[g.country] ??= []).push({
      id: g.id, name: g.name, poolingType: g.poolingType, minAmount: g.minAmount, products: g.products,
    });
  }
  for (const list of Object.values(out)) list.sort((a, b) => b.products - a.products);
  return out;
}

export async function searchProducts(filters: SearchFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  if (!filters.shippingGroupId && filters.originCountries && filters.originCountries.length > 0) {
    return searchProductsByOrigin(filters, page, limit, offset);
  }

  let query = supabase
    .from("products")
    .select(
      `
      *,
      categories (*),
      product_images (*),
      product_variants (id),
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

  if (filters.brands && filters.brands.length > 0) {
    query = query.in("brand", filters.brands);
  }

  if (filters.shippingGroupId) {
    query = query.eq("shipping_group_id", filters.shippingGroupId);
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
      query = query.order("created_at", { ascending: false });
      break;
    case "name":
    default:
      query = query.order("name", { ascending: true });
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
    p_brands: filters.brands && filters.brands.length > 0 ? filters.brands : null,
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
      product_variants (id),
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

async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data } = await query(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function getCountryFacets(): Promise<Record<string, number>> {
  const supabase = await createClient();
  // Supabase caps unbounded selects at ~1000 rows — this catalog has 15k+
  // products, so both queries must be paginated or counts are silently
  // truncated to whatever happened to be in the first page.
  const [origins, activeProducts] = await Promise.all([
    fetchAllRows<{ id: string; resolved_country: string | null }>((from, to) =>
      supabase.from("products_with_origin").select("id, resolved_country").range(from, to)
    ),
    fetchAllRows<{ id: string }>((from, to) =>
      supabase
        .from("products")
        .select("id")
        .eq("moderation_status", "approved")
        .eq("is_active", true)
        .range(from, to)
    ),
  ]);

  const activeIds = new Set(activeProducts.map((p) => p.id));
  const counts: Record<string, number> = Object.fromEntries(
    MARKETPLACE_COUNTRIES.map((code) => [code, 0])
  );

  for (const row of origins) {
    if (!row.id || !activeIds.has(row.id)) continue;
    if (!isMarketplaceCountry(row.resolved_country)) continue;
    counts[row.resolved_country] = (counts[row.resolved_country] ?? 0) + 1;
  }

  return counts;
}

export async function getBrandFacets(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const rows = await fetchAllRows<{ brand: string | null }>((from, to) =>
    supabase
      .from("products")
      .select("brand")
      .eq("moderation_status", "approved")
      .eq("is_active", true)
      .not("brand", "is", null)
      .range(from, to)
  );

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const brand = row.brand;
    if (!brand) continue;
    counts[brand] = (counts[brand] ?? 0) + 1;
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
