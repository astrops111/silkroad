"use server";

import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getBrandFacets } from "./marketplace";
import { brandSlug } from "@/lib/product-url";

export interface BrandListItem {
  brand: string;
  slug: string;
  count: number;
}

export interface BrandProduct {
  id: string;
  name: string;
  slug: string | null;
  originCountry: string | null;
  categoryPath: string | null;
  basePrice: number; // minor units (cents)
  moq: number | null;
  image: string | null;
  isFeatured: boolean;
}

export interface BrandCategoryGroup {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  count: number;
  products: BrandProduct[]; // top 5
}

export interface BrandLanding {
  brand: string;
  slug: string;
  totalProducts: number;
  origins: string[];
  categories: BrandCategoryGroup[];
}

/** All brands (approved+active) with product counts, sorted by count desc. */
export async function listBrands(): Promise<BrandListItem[]> {
  const facets = await getBrandFacets();
  return Object.entries(facets)
    .map(([brand, count]) => ({ brand, slug: brandSlug(brand), count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
}

/** Map a URL brand slug back to its canonical brand string. */
export async function resolveBrandFromSlug(slug: string): Promise<string | null> {
  const brands = await listBrands();
  return brands.find((b) => b.slug === slug)?.brand ?? null;
}

interface CatEmbed {
  name: string | null;
  slug: string | null;
  path: string | null;
}
interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  origin_country: string | null;
  base_price: number;
  moq: number | null;
  is_featured: boolean | null;
  created_at: string | null;
  category_id: string | null;
  categories: CatEmbed | CatEmbed[] | null;
  product_images: { url: string; is_primary: boolean | null; sort_order: number | null }[] | null;
}

function firstCat(c: BrandRow["categories"]): CatEmbed | null {
  return Array.isArray(c) ? c[0] ?? null : c;
}

function toBrandProduct(r: BrandRow): BrandProduct {
  const imgs = (r.product_images ?? [])
    .slice()
    .sort(
      (a, b) =>
        (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    originCountry: r.origin_country,
    categoryPath: firstCat(r.categories)?.path ?? null,
    basePrice: r.base_price,
    moq: r.moq,
    image: imgs[0]?.url ?? null,
    isFeatured: !!r.is_featured,
  };
}

const getBrandLandingCached = unstable_cache(
  async (brand: string): Promise<BrandLanding | null> => {
    const supabase = createServiceClient();
    let rows: BrandRow[] = [];
    let from = 0;
    for (;;) {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, origin_country, base_price, moq, is_featured, created_at, category_id, categories(name, slug, path), product_images(url, is_primary, sort_order)"
        )
        .eq("brand", brand)
        .eq("moderation_status", "approved")
        .eq("is_active", true)
        .range(from, from + 999);
      const batch = (data ?? []) as unknown as BrandRow[];
      if (batch.length === 0) break;
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
      from += 1000;
    }
    if (rows.length === 0) return null;

    const origins = [...new Set(rows.map((r) => r.origin_country).filter((c): c is string => !!c))];

    const rowsByCat = new Map<string, BrandRow[]>();
    for (const r of rows) {
      const catId = r.category_id ?? "uncategorized";
      const list = rowsByCat.get(catId);
      if (list) list.push(r);
      else rowsByCat.set(catId, [r]);
    }

    const categories: BrandCategoryGroup[] = [];
    for (const [catId, catRows] of rowsByCat) {
      // Top 5 = featured first, then newest.
      catRows.sort(
        (a, b) =>
          (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) ||
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
      );
      const cat = firstCat(catRows[0].categories);
      categories.push({
        categoryId: catId,
        categoryName: cat?.name ?? "General",
        categorySlug: cat?.slug ?? "",
        count: catRows.length,
        products: catRows.slice(0, 5).map(toBrandProduct),
      });
    }
    categories.sort((a, b) => b.count - a.count);

    return { brand, slug: brandSlug(brand), totalProducts: rows.length, origins, categories };
  },
  ["brand-landing"],
  { revalidate: 3600, tags: ["catalog"] }
);

export async function getBrandLanding(brand: string): Promise<BrandLanding | null> {
  return getBrandLandingCached(brand);
}
