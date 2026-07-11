import { searchProducts, getCountryFacets } from "@/lib/queries/marketplace";
import { getSubcategoriesByParentSlug, getCategoryBySlug } from "@/lib/queries/categories";
import { applyMarkup } from "@/lib/pricing";
import { isMarketplaceCountry } from "@/lib/countries";
import {
  MarketplaceClient,
  type MarketplaceProduct,
  type MarketplaceSubcategory,
} from "./marketplace-client";
import { ShoppingAssistantWidget } from "@/components/ai/shopping-assistant-widget";
import { RecommendationRail } from "@/components/ai/recommendation-rail";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const activeCategorySlug = sp.category ?? null;
  const activeCountry = isMarketplaceCountry(sp.country) ? sp.country.toUpperCase() : null;

  let products: MarketplaceProduct[] = [];
  let subcategories: MarketplaceSubcategory[] = [];
  let categoryIds: string[] | undefined;
  const countryFacets = await getCountryFacets();

  if (activeCategorySlug) {
    const [parentCat, subs] = await Promise.all([
      getCategoryBySlug(activeCategorySlug),
      getSubcategoriesByParentSlug(activeCategorySlug),
    ]);
    subcategories = subs.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      nameLocal: s.name_local,
    }));
    categoryIds = [
      ...(parentCat ? [parentCat.id] : []),
      ...subs.map((s) => s.id),
    ];
  }

  try {
    const result = await searchProducts({
      categoryIds,
      originCountries: activeCountry ? [activeCountry] : undefined,
      sort: "newest",
      limit: 20,
    });
    products = result.products.map((p) => {
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
        rating: 4.5,
        reviews: 0,
        responseTime: "< 24h",
        leadTimeDays: p.lead_time_days ?? null,
        minOrderAmount: p.min_order_amount != null ? p.min_order_amount / 100 : null,
        minOrderGroupedBy: p.min_order_grouped_by ?? null,
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
      />
      <RecommendationRail title="Recommended for you" forMe />
      <ShoppingAssistantWidget />
    </>
  );
}
