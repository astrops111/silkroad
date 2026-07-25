import { searchProducts, getCountryFacets, getBrandFacets, getUseCaseFacets, getPoolingInfoByProductIds, getPoolingRulesByCountry, getShippingGroupFacets } from "@/lib/queries/marketplace";
import {
  getTopLevelCategoriesWithCount,
  getCategories,
  getCategoryProductCounts,
  type Category,
} from "@/lib/queries/categories";
import { applyMarkup } from "@/lib/pricing";
import { buildProductPath } from "@/lib/product-url";
import { isMarketplaceCountry } from "@/lib/countries";
import {
  MarketplaceClient,
  type MarketplaceProduct,
  type MarketplaceSubcategory,
} from "./marketplace-client";
import { RecommendationRail } from "@/components/ai/recommendation-rail";

// Collects a category id plus every descendant at any depth (the tree here
// goes up to 3 levels — Beauty > Facial > Serum & Essence, for example — and
// products can be assigned at any leaf, not just direct children).
function collectDescendantIds(rootId: string, allCategories: Category[]): string[] {
  const childrenByParentId = new Map<string, string[]>();
  for (const c of allCategories) {
    if (!c.parent_id) continue;
    const list = childrenByParentId.get(c.parent_id) ?? [];
    list.push(c.id);
    childrenByParentId.set(c.parent_id, list);
  }
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const children = childrenByParentId.get(current) ?? [];
    for (const childId of children) {
      ids.push(childId);
      queue.push(childId);
    }
  }
  return ids;
}

const MARKETPLACE_CATEGORY_SLUGS = [
  "home",
  "hotels",
  "consumer-electronics",
  "beauty",
  "baby-products",
  "groceries",
] as const;

export const MARKETPLACE_PAGE_SIZES = [20, 50, 100, 200] as const;
export const MARKETPLACE_DEFAULT_PAGE_SIZE = 50;
export const MARKETPLACE_SORT_OPTIONS = ["name", "price_asc", "price_desc", "newest", "popular"] as const;
export const MARKETPLACE_DEFAULT_SORT = "name";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sub?: string; country?: string; brand?: string; use?: string; limit?: string; group?: string; page?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const activeCategorySlug = sp.category ?? null;
  // The deepest selected descendant slug — may be a level-1 subcategory
  // (e.g. "computer-peripherals") or a level-2 leaf (e.g. "peripherals-mice").
  // Slugs are globally unique, so one param covers both depths.
  const activeSubSlug = sp.sub ?? null;
  const activeCountry = isMarketplaceCountry(sp.country) ? sp.country.toUpperCase() : null;
  const activeBrands = sp.brand ? sp.brand.split(",").filter(Boolean) : undefined;
  const activeUseCases = sp.use ? sp.use.split(",").filter(Boolean) : undefined;
  const activeGroupId =
    sp.group && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sp.group)
      ? sp.group
      : null;
  const requestedLimit = Number(sp.limit);
  const pageSize = MARKETPLACE_PAGE_SIZES.includes(requestedLimit as (typeof MARKETPLACE_PAGE_SIZES)[number])
    ? requestedLimit
    : MARKETPLACE_DEFAULT_PAGE_SIZE;
  const currentPage = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const activeSort = (MARKETPLACE_SORT_OPTIONS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as (typeof MARKETPLACE_SORT_OPTIONS)[number])
    : MARKETPLACE_DEFAULT_SORT;

  let products: MarketplaceProduct[] = [];
  let subcategories: MarketplaceSubcategory[] = [];
  let categoryIds: string[] | undefined;
  let totalProductCount: number | undefined;

  const activeCountries = activeCountry ? [activeCountry] : undefined;
  // Everything under the sidebar (category counts + brand/use/region facets)
  // cross-filters against whichever of these is currently active — selecting
  // Korea, a brand, or a use-case narrows what the OTHER filters show too.
  // The category ticker deliberately stays out of this scope (see below) so
  // it keeps browsing as a stable visual nav, independent of filter state.
  const sidebarScope = {
    originCountries: activeCountries,
    brands: activeBrands,
    useCaseSlugs: activeUseCases,
  };

  const [
    allTopCategories,
    allCategories,
    directCounts,
    sidebarTopCategories,
    sidebarDirectCounts,
    poolingRules,
    groupFacets,
  ] = await Promise.all([
    getTopLevelCategoriesWithCount(),
    getCategories(),
    getCategoryProductCounts(),
    getTopLevelCategoriesWithCount(sidebarScope),
    getCategoryProductCounts(sidebarScope),
    getPoolingRulesByCountry(),
    getShippingGroupFacets(),
  ]);
  // Ticker data (TopCategoryTicker/SubcategoryGrid) — unscoped by design, so
  // the visual category browser never shifts under a filter selection.
  const topCategories = MARKETPLACE_CATEGORY_SLUGS.map((slug) =>
    allTopCategories.find((c) => c.slug === slug)
  )
    .filter((c): c is NonNullable<typeof c> => c != null)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      nameLocal: c.name_local,
      productCount: c.productCount,
    }));
  // Sidebar's "Categories" list counts — scoped to the active region/brand/use
  // filters, keyed by slug for the fixed CATEGORIES list in marketplace-client.
  const categoryFacetCounts: Record<string, number> = Object.fromEntries(
    sidebarTopCategories.map((c) => [c.slug, c.productCount])
  );

  // Rolled-up count for a category id: its own direct products plus every
  // descendant's. The unscoped variant feeds the ticker; the scoped variant
  // feeds the sidebar's expandable category tree.
  const rollupCount = (id: string) =>
    collectDescendantIds(id, allCategories).reduce((sum, cid) => sum + (directCounts[cid] ?? 0), 0);
  const rollupCountScoped = (id: string) =>
    collectDescendantIds(id, allCategories).reduce((sum, cid) => sum + (sidebarDirectCounts[cid] ?? 0), 0);

  // Level-1 subcategories grouped by their top-level parent's slug, and
  // level-2 leaves grouped by their level-1 parent's slug — lets the sidebar
  // expand any category in place, two levels deep, without extra navigation.
  const categoryIdToSlug = new Map(allCategories.map((c) => [c.id, c.slug]));
  const subcategoriesByParent: Record<string, MarketplaceSubcategory[]> = {};
  const leavesByParent: Record<string, MarketplaceSubcategory[]> = {};
  for (const c of allCategories) {
    if (!c.parent_id || (c.level !== 1 && c.level !== 2)) continue;
    const parentSlug = categoryIdToSlug.get(c.parent_id);
    if (!parentSlug) continue;
    const target = c.level === 1 ? subcategoriesByParent : leavesByParent;
    (target[parentSlug] ??= []).push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameLocal: c.name_local,
      productCount: rollupCountScoped(c.id),
    });
  }

  if (activeCategorySlug) {
    const parentCat = allCategories.find((c) => c.slug === activeCategorySlug);
    if (parentCat) {
      // activeSubSlug may name a level-1 subcategory or a level-2 leaf
      // (slugs are globally unique) — whichever it resolves to becomes the
      // filter scope; falls back to the top category itself.
      const scopeCat =
        (activeSubSlug && allCategories.find((c) => c.slug === activeSubSlug)) || parentCat;
      const directChildren = allCategories.filter((c) => c.parent_id === scopeCat.id);
      // Ticker data — unscoped, per above.
      subcategories = directChildren.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        nameLocal: s.name_local,
        productCount: rollupCount(s.id),
      }));
      categoryIds = collectDescendantIds(scopeCat.id, allCategories);
    }
  }

  // Brand/Use/Region facets cross-filter against the current category
  // selection AND each other — e.g. selecting Korea narrows the brand and
  // use-case lists to only what's actually available from Korea.
  const [brandFacets, useFacets, countryFacets] = await Promise.all([
    getBrandFacets(categoryIds, activeCountries, activeUseCases),
    getUseCaseFacets(categoryIds, activeCountries, activeBrands),
    getCountryFacets(categoryIds, activeBrands, activeUseCases),
  ]);

  try {
    const result = await searchProducts({
      categoryIds,
      originCountries: activeCountries,
      brands: activeBrands,
      useCaseSlugs: activeUseCases,
      shippingGroupId: activeGroupId ?? undefined,
      sort: activeSort,
      limit: pageSize,
      page: currentPage,
    });
    totalProductCount = result.total;
    const poolingById = await getPoolingInfoByProductIds(result.products.map((p) => p.id));
    products = result.products.map((p) => {
      const pooling = poolingById[p.id];
      // Suppliers selling by the box (carton) — box_pack_qty > 1 — quote and
      // sell per box, not per piece; mirrors the product detail page's logic.
      const boxPackQty = p.box_pack_qty ?? 1;
      const unitPrice = applyMarkup(p.base_price / 100);
      return {
        id: p.id,
        supplierId: p.supplier_id,
        supplierName: (p.companies as { name?: string } | null)?.name ?? "",
        currency: p.currency ?? "USD",
        href: buildProductPath({
          id: p.id,
          slug: p.slug,
          name: p.name,
          origin_country: p.origin_country,
          category_path: (p.categories as { path?: string } | null)?.path ?? null,
        }),
        name: p.name,
        originCountry:
          p.origin_country ??
          (p.companies as { country_code: string } | null)?.country_code ??
          null,
        tradeTerm: p.trade_term ?? null,
        price: boxPackQty > 1 ? unitPrice * boxPackQty : unitPrice,
        moq: boxPackQty > 1 ? Math.max(1, Math.round((p.moq ?? 1) / boxPackQty)) : p.moq ?? 1,
        unit: boxPackQty > 1 ? "Box" : "Piece",
        boxPackQty: boxPackQty > 1 ? boxPackQty : undefined,
        unitPrice,
        rating: 4.5,
        reviews: 0,
        responseTime: "< 24h",
        leadTimeDays: p.lead_time_days ?? null,
        minOrderAmount: p.min_order_amount != null ? p.min_order_amount / 100 : null,
        minOrderGroupedBy: p.min_order_grouped_by ?? null,
        poolingType: pooling?.pooling_group_type ?? null,
        groupMinOrderAmount: pooling?.group_min_order_amount ?? null,
        variantCount: p.product_variants?.length ?? 0,
        image:
          p.product_images?.[0]?.url ??
          "from-slate-200 to-slate-300",
        category: (p.categories as { name: string } | null)?.name ?? "General",
        tags: [
          ...(p.is_featured ? ["Hot Sale"] : []),
        ],
      };
    });
  } catch {
    // DB not connected or empty — will fall back to mock data in client
  }

  return (
    <>
      <MarketplaceClient
        initialProducts={products}
        subcategories={subcategories}
        countryFacets={countryFacets}
        brandFacets={brandFacets}
        useFacets={useFacets}
        topCategories={topCategories}
        categoryFacetCounts={categoryFacetCounts}
        subcategoriesByParent={subcategoriesByParent}
        leavesByParent={leavesByParent}
        totalProductCount={totalProductCount}
        currentPage={currentPage}
        poolingRules={poolingRules}
        groupFacets={groupFacets}
      />
      <RecommendationRail title="Recommended for you" forMe />
    </>
  );
}
