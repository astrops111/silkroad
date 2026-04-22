import { searchProducts } from "@/lib/queries/marketplace";
import { getSubcategoriesByParentSlug } from "@/lib/queries/categories";
import { applyMarkup } from "@/lib/pricing";
import {
  MarketplaceClient,
  type MarketplaceProduct,
  type MarketplaceSubcategory,
} from "./marketplace-client";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const activeCategorySlug = sp.category ?? null;

  let products: MarketplaceProduct[] = [];
  let subcategories: MarketplaceSubcategory[] = [];

  if (activeCategorySlug) {
    const subs = await getSubcategoriesByParentSlug(activeCategorySlug);
    subcategories = subs.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      nameLocal: s.name_local,
    }));
  }

  try {
    const result = await searchProducts({ sort: "newest", limit: 20 });
    products = result.products.map((p) => ({
      id: p.id,
      name: p.name,
      originCountry:
        p.origin_country ??
        (p.companies as { country_code: string } | null)?.country_code ??
        null,
      tradeTerm: p.trade_term ?? null,
      price: applyMarkup(p.base_price / 100),
      moq: p.moq,
      unit: "Pieces",
      rating: 4.5,
      reviews: 0,
      responseTime: "< 24h",
      image:
        p.product_images?.[0]?.url ??
        "from-slate-200 to-slate-300",
      tradeAssurance: true,
      category: (p.categories as { name: string } | null)?.name ?? "General",
      tags: [
        ...(p.is_featured ? ["Hot Sale"] : []),
        "Trade Assurance",
      ],
    }));
  } catch {
    // DB not connected or empty — will fall back to mock data in client
  }

  return (
    <MarketplaceClient
      initialProducts={products}
      subcategories={subcategories}
    />
  );
}
