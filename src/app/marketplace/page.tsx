import { searchProducts, getCountryFacets } from "@/lib/queries/marketplace";
import { getSubcategoriesByParentSlug, getCategoryBySlug } from "@/lib/queries/categories";
import { applyMarkup } from "@/lib/pricing";
import { isMarketplaceCountry } from "@/lib/countries";
import {
  MarketplaceClient,
  type MarketplaceProduct,
  type MarketplaceSubcategory,
} from "./marketplace-client";

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
    products = result.products.map((p) => ({
      id: p.id,
      name: p.name,
      originCountry:
        p.origin_country ??
        (p.companies as { country_code: string } | null)?.country_code ??
        null,
      tradeTerm: p.trade_term ?? null,
      price: applyMarkup(p.base_price / 100),
      moq: p.moq ?? 1,
      unit: "Pieces",
      rating: 4.5,
      reviews: 0,
      responseTime: "< 24h",
      image:
        p.product_images?.[0]?.url ??
        "from-slate-200 to-slate-300",
      category: (p.categories as { name: string } | null)?.name ?? "General",
      tags: [
        ...(p.is_featured ? ["Hot Sale"] : []),
      ],
    }));
  } catch {
    // DB not connected or empty — will fall back to mock data in client
  }

  return (
    <MarketplaceClient
      initialProducts={products}
      subcategories={subcategories}
      countryFacets={countryFacets}
    />
  );
}
