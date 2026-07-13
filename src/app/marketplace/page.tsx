import { searchProducts, getCountryFacets, getBrandFacets, getPoolingInfoByProductIds, getPoolingRulesByCountry, getShippingGroupFacets } from "@/lib/queries/marketplace";
import {
  getTopLevelCategoriesWithCount,
  getCategories,
  type Category,
} from "@/lib/queries/categories";
import { applyMarkup } from "@/lib/pricing";
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

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; country?: string; brand?: string; limit?: string; group?: string }>;
}) {
  const sp = await searchParams;
  const activeCategorySlug = sp.category ?? null;
  const activeCountry = isMarketplaceCountry(sp.country) ? sp.country.toUpperCase() : null;
  const activeBrands = sp.brand ? sp.brand.split(",").filter(Boolean) : undefined;
  const activeGroupId =
    sp.group && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sp.group)
      ? sp.group
      : null;
  const requestedLimit = Number(sp.limit);
  const pageSize = MARKETPLACE_PAGE_SIZES.includes(requestedLimit as (typeof MARKETPLACE_PAGE_SIZES)[number])
    ? requestedLimit
    : MARKETPLACE_DEFAULT_PAGE_SIZE;

  let products: MarketplaceProduct[] = [];
  let subcategories: MarketplaceSubcategory[] = [];
  let categoryIds: string[] | undefined;
  let totalProductCount: number | undefined;
  const [countryFacets, brandFacets, allTopCategories, allCategories, poolingRules, groupFacets] = await Promise.all([
    getCountryFacets(),
    getBrandFacets(),
    getTopLevelCategoriesWithCount(),
    getCategories(),
    getPoolingRulesByCountry(),
    getShippingGroupFacets(),
  ]);
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

  // Level-1 subcategories grouped by their top-level parent's slug, so the
  // sidebar can expand any category in place without an extra navigation.
  const categoryIdToSlug = new Map(allCategories.map((c) => [c.id, c.slug]));
  const subcategoriesByParent: Record<
    string,
    { id: string; slug: string; name: string; nameLocal: string | null }[]
  > = {};
  for (const c of allCategories) {
    if (c.level !== 1 || !c.parent_id) continue;
    const parentSlug = categoryIdToSlug.get(c.parent_id);
    if (!parentSlug) continue;
    (subcategoriesByParent[parentSlug] ??= []).push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameLocal: c.name_local,
    });
  }

  if (activeCategorySlug) {
    const parentCat = allCategories.find((c) => c.slug === activeCategorySlug);
    if (parentCat) {
      const directChildren = allCategories.filter((c) => c.parent_id === parentCat.id);
      subcategories = directChildren.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        nameLocal: s.name_local,
      }));
      categoryIds = collectDescendantIds(parentCat.id, allCategories);
    }
  }

  try {
    const result = await searchProducts({
      categoryIds,
      originCountries: activeCountry ? [activeCountry] : undefined,
      brands: activeBrands,
      shippingGroupId: activeGroupId ?? undefined,
      sort: "name",
      limit: pageSize,
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
        topCategories={topCategories}
        subcategoriesByParent={subcategoriesByParent}
        totalProductCount={totalProductCount}
        poolingRules={poolingRules}
        groupFacets={groupFacets}
      />
      <RecommendationRail title="Recommended for you" forMe />
    </>
  );
}
