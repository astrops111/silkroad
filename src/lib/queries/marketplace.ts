"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import type { ProductWithDetails } from "./products";
import type { Database } from "@/lib/supabase/database.types";
import { MARKETPLACE_COUNTRIES, isMarketplaceCountry } from "@/lib/countries";

// ─── Caching ────────────────────────────────────────────────────────────────
// The marketplace page renders the same global facet/category queries on every
// request, and its faceted filter URLs (?brand=, ?group=, ?country=) are heavily
// crawled — each render otherwise re-runs full-table scans against Supabase.
// These read only the public approved+active catalog, so they are wrapped in
// unstable_cache and use the cookieless service client (unstable_cache callbacks
// cannot touch request cookies). Revalidate windows are short; a future admin
// mutation can revalidateTag("catalog") to flush immediately.
const CATALOG_TAG = "catalog";
const FACET_TTL = 300; // seconds — global facets/categories
const LISTING_TTL = 120; // seconds — parameterized product listings

interface SearchFilters {
  category?: string;
  categoryIds?: string[];
  originCountries?: string[];
  search?: string;
  priceMin?: number;
  priceMax?: number;
  moqMax?: number;
  brands?: string[];
  /** Slugs of use_case labels (see getUseCaseFacets) — "Gaming", "Business /
   *  Office", etc. Bypasses the origin RPC path, same as shippingGroupId,
   *  since search_product_ids doesn't know about label joins. */
  useCaseSlugs?: string[];
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

const getPoolingInfoByProductIdsCached = unstable_cache(
  async (productIds: string[]): Promise<Record<string, ProductPoolingInfo>> => {
    const supabase = createServiceClient();
    // RPC (not the products_pooling_info view) — bakes the id filter into
    // the function body so Postgres still uses the products_pkey index;
    // see the perf note in migration 00144.
    const { data, error } = await supabase.rpc("get_products_pooling_info_by_ids", {
      p_ids: productIds,
    });
    if (error) {
      console.error("[marketplace] pooling info failed:", error);
      return {};
    }
    const map: Record<string, ProductPoolingInfo> = {};
    for (const r of data ?? []) {
      if (r.id) map[r.id] = r;
    }
    return map;
  },
  ["marketplace-pooling-by-ids"],
  { revalidate: LISTING_TTL, tags: [CATALOG_TAG] }
);

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
  return getPoolingInfoByProductIdsCached(productIds);
}

export type RegionPoolingRule = {
  poolingType: string; // 'supplier'|'supplier_group'|'country'|'custom'
  minAmount: number | null; // USD dollars
  products: number;
};

type PoolingFacetRow = {
  group_id: string;
  country_code: string;
  pooling_type: string | null;
  min_order_amount: number | null;
  products: number;
};

// One GROUP BY over products_pooling_info (marketplace_pooling_facets RPC,
// 00141) — one row per active shipping group carrying live products. Both
// the region pooling banner and the per-region group sub-filters derive
// from it, so the catalog is aggregated once instead of being paged to
// Node twice.
const getPoolingFacetRowsCached = unstable_cache(
  async (): Promise<PoolingFacetRow[]> => {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("marketplace_pooling_facets", {});
    if (error) {
      console.error("[marketplace] pooling facets failed:", error);
      return [];
    }
    // supabase-js can't infer the row type for a zero-arg RPC — pin it to
    // the generated Returns type.
    type RpcRow = Database["public"]["Functions"]["marketplace_pooling_facets"]["Returns"][number];
    return ((data ?? []) as RpcRow[]).map((r) => ({
      group_id: r.group_id,
      country_code: r.country_code,
      pooling_type: r.pooling_type ?? null,
      min_order_amount: r.min_order_amount == null ? null : Number(r.min_order_amount),
      products: Number(r.products),
    }));
  },
  ["marketplace-pooling-facet-rows"],
  { revalidate: FACET_TTL, tags: [CATALOG_TAG] }
);

/**
 * Region-level MOA/groupage rules for the marketplace banner: for each origin
 * country that anchors an active shipping group, the pooling models in play
 * and their combined minimums. Aggregated from products_pooling_info.
 */
export async function getPoolingRulesByCountry(): Promise<Record<string, RegionPoolingRule[]>> {
  const rows = await getPoolingFacetRowsCached();
  const byKey = new Map<string, { country: string } & RegionPoolingRule>();
  for (const r of rows) {
    if (!r.country_code || !r.pooling_type) continue;
    const key = `${r.country_code}::${r.pooling_type}`;
    let agg = byKey.get(key);
    if (!agg) {
      agg = { country: r.country_code, poolingType: r.pooling_type, minAmount: null, products: 0 };
      byKey.set(key, agg);
    }
    agg.products += r.products;
    if (r.min_order_amount != null) {
      agg.minAmount = Math.max(agg.minAmount ?? 0, r.min_order_amount);
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
  poolingType: string;
  minAmount: number | null; // USD dollars
  products: number;
};

/**
 * Active shipping groups (MOA pools / groupage batches) per origin country,
 * for the marketplace sidebar's region sub-filters. Deliberately excludes the
 * admin-chosen group name — buyers see an anonymous region-based ID computed
 * client-side from the group uuid.
 */
export async function getShippingGroupFacets(): Promise<Record<string, ShippingGroupFacet[]>> {
  const rows = await getPoolingFacetRowsCached();
  const out: Record<string, ShippingGroupFacet[]> = {};
  for (const r of rows) {
    if (!r.group_id || !r.country_code) continue;
    (out[r.country_code] ??= []).push({
      id: r.group_id,
      poolingType: r.pooling_type ?? "custom",
      minAmount: r.min_order_amount,
      products: r.products,
    });
  }
  for (const list of Object.values(out)) list.sort((a, b) => b.products - a.products);
  return out;
}

const searchProductsCached = unstable_cache(
  async (filters: SearchFilters) => {
    const supabase = createServiceClient();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    // Origin (resolved via ports/company fallback) and use-case (label
    // join) filters can't be expressed as PostgREST column filters, so
    // they go through the search_product_ids RPC (00141): SQL resolves the
    // matching id page + total, then the embeds are fetched for just that
    // page. Everything else takes the single-query direct path below.
    const hasUseCase = !!filters.useCaseSlugs && filters.useCaseSlugs.length > 0;
    const hasOrigin = !!filters.originCountries && filters.originCountries.length > 0;
    if (hasUseCase || (hasOrigin && !filters.shippingGroupId)) {
      return searchProductsViaRpc(supabase, filters, page, limit, offset);
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
  },
  ["marketplace-search-products"],
  { revalidate: LISTING_TTL, tags: [CATALOG_TAG] }
);

export async function searchProducts(filters: SearchFilters = {}) {
  return searchProductsCached(filters);
}

async function searchProductsViaRpc(
  supabase: ReturnType<typeof createServiceClient>,
  filters: SearchFilters,
  page: number,
  limit: number,
  offset: number
) {
  // A shipping group already pins the origin, so an explicit region
  // selection is redundant alongside it (and the group's anchor country
  // can differ from a product's resolved country) — mirror the direct
  // path, which ignores originCountries when a group is set.
  const originCountries =
    !filters.shippingGroupId && filters.originCountries && filters.originCountries.length > 0
      ? filters.originCountries
      : undefined;
  const { data: rpcData, error: rpcError } = await supabase.rpc("search_product_ids", {
    p_category_ids:
      filters.categoryIds && filters.categoryIds.length > 0
        ? filters.categoryIds
        : filters.category
        ? [filters.category]
        : undefined,
    p_origin_countries: originCountries,
    p_search: filters.search || undefined,
    p_price_min: filters.priceMin !== undefined ? Math.round(filters.priceMin * 100) : undefined,
    p_price_max: filters.priceMax !== undefined ? Math.round(filters.priceMax * 100) : undefined,
    p_moq_max: filters.moqMax ?? undefined,
    p_brands: filters.brands && filters.brands.length > 0 ? filters.brands : undefined,
    p_use_case_slugs:
      filters.useCaseSlugs && filters.useCaseSlugs.length > 0 ? filters.useCaseSlugs : undefined,
    p_shipping_group_id: filters.shippingGroupId || undefined,
    p_sort: filters.sort ?? "name",
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

type FacetDimension = "category" | "brand" | "country" | "use_case";

export type FacetScope = {
  categoryIds?: string[];
  originCountries?: string[];
  brands?: string[];
  useCaseSlugs?: string[];
};

const nonEmpty = (v?: string[]) => (v && v.length > 0 ? v : undefined);

// Every marketplace facet is a GROUP BY over the live catalog cross-
// filtered by the other active facets. The marketplace_facet_counts RPC
// (00141) does that in SQL and returns one row per bucket, replacing the
// old approach of paging the entire 15k-row catalog to Node in 1000-row
// slices and tallying in JS — per distinct filter combination.
const getFacetCountsCached = unstable_cache(
  async (dimension: FacetDimension, scope: FacetScope): Promise<Record<string, number>> => {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("marketplace_facet_counts", {
      p_dimension: dimension,
      p_category_ids: nonEmpty(scope.categoryIds),
      p_origin_countries: nonEmpty(scope.originCountries),
      p_brands: nonEmpty(scope.brands),
      p_use_case_slugs: nonEmpty(scope.useCaseSlugs),
    });
    if (error) {
      console.error(`[marketplace] ${dimension} facets failed:`, error);
      return {};
    }
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      if (row.key) counts[row.key] = Number(row.n);
    }
    return counts;
  },
  ["marketplace-facet-counts"],
  { revalidate: FACET_TTL, tags: [CATALOG_TAG] }
);

/** Facet counts for one dimension, scoped to the other active filters.
 *  Undefined/empty scope arrays are normalised away so cache keys are
 *  stable regardless of how the caller spelled "no filter". */
export async function getFacetCounts(
  dimension: FacetDimension,
  scope: FacetScope = {}
): Promise<Record<string, number>> {
  return getFacetCountsCached(dimension, {
    categoryIds: nonEmpty(scope.categoryIds),
    originCountries: nonEmpty(scope.originCountries),
    brands: nonEmpty(scope.brands),
    useCaseSlugs: nonEmpty(scope.useCaseSlugs),
  });
}

/** Region filter facet, scoped to the current category selection plus any
 *  active brand/use-case filters — so picking a brand or use-case narrows
 *  which regions show up here too. Always returns every marketplace
 *  country (zero-filled) and nothing else. */
export async function getCountryFacets(
  categoryIds?: string[],
  brands?: string[],
  useCaseSlugs?: string[]
): Promise<Record<string, number>> {
  const raw = await getFacetCounts("country", { categoryIds, brands, useCaseSlugs });
  const counts: Record<string, number> = Object.fromEntries(
    MARKETPLACE_COUNTRIES.map((code) => [code, 0])
  );
  for (const [country, n] of Object.entries(raw)) {
    if (isMarketplaceCountry(country)) counts[country] = n;
  }
  return counts;
}

/** Brand filter facet, scoped to the current category selection plus any
 *  active region/use-case filters (so selecting Korea doesn't leave brands
 *  listed that have zero products in that region). */
export async function getBrandFacets(
  categoryIds?: string[],
  countries?: string[],
  useCaseSlugs?: string[]
): Promise<Record<string, number>> {
  return getFacetCounts("brand", { categoryIds, originCountries: countries, useCaseSlugs });
}

export type UseCaseFacet = { slug: string; name: string; count: number };

const getUseCaseLabelsCached = unstable_cache(
  async (): Promise<{ slug: string; name: string }[]> => {
    const supabase = createServiceClient();
    const { data } = await supabase.from("labels").select("slug, name").eq("kind", "use_case");
    return data ?? [];
  },
  ["marketplace-use-case-labels"],
  { revalidate: FACET_TTL, tags: [CATALOG_TAG] }
);

/** "Use" filter facet — buyer-facing labels like Gaming / Business & Office —
 *  scoped to the current category selection plus any active region/brand
 *  filters. */
export async function getUseCaseFacets(
  categoryIds?: string[],
  countries?: string[],
  brands?: string[]
): Promise<UseCaseFacet[]> {
  const [labels, counts] = await Promise.all([
    getUseCaseLabelsCached(),
    getFacetCounts("use_case", { categoryIds, originCountries: countries, brands }),
  ]);
  return labels
    .map((l) => ({ slug: l.slug, name: l.name, count: counts[l.slug] ?? 0 }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
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
