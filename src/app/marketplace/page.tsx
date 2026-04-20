import { searchProducts } from "@/lib/queries/marketplace";
import { MarketplaceClient, type MarketplaceProduct } from "./marketplace-client";

export default async function MarketplacePage() {
  let products: MarketplaceProduct[] = [];

  try {
    const result = await searchProducts({ sort: "newest", limit: 20 });
    products = result.products.map((p) => ({
      id: p.id,
      name: p.name,
      supplier: (p.companies as { name: string } | null)?.name ?? "Unknown Supplier",
      supplierVerified:
        (p.companies as { verification_status: string } | null)?.verification_status === "verified",
      supplierCountry:
        (p.companies as { country_code: string } | null)?.country_code ?? "CN",
      supplierProvince: "",
      price: p.base_price / 100,
      priceMax: p.compare_price ? p.compare_price / 100 : (p.base_price / 100) * 1.4,
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

  return <MarketplaceClient initialProducts={products} />;
}
