import type { RailProduct } from "@/components/landing/product-rail";
import { listResourceListings } from "@/lib/queries/resources";
import CommoditiesClient from "./commodities-client";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/5239818/pexels-photo-5239818.jpeg?auto=compress&cs=tinysrgb&w=600";

export default async function CommoditiesPortal() {
  const { listings } = await listResourceListings({ sort: "newest", limit: 12 });

  const products: RailProduct[] = listings.map((l) => ({
    id: l.id,
    href: `/resources/listings/${l.id}`,
    name: l.name_en,
    image: l.images?.[0] ?? FALLBACK_IMAGE,
    amount: Math.round((l.price_per_unit_usd ?? 0) * 100),
    currency: l.currency ?? "USD",
    unit: l.unit_of_measure ?? undefined,
    supplier: l.companies?.name ?? "SilkRoad supplier",
    country: l.origin_country,
    moq: l.min_order_quantity
      ? `${l.min_order_quantity} ${l.unit_of_measure ?? ""}`.trim()
      : "—",
  }));

  return <CommoditiesClient products={products} />;
}
