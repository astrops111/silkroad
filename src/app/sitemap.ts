import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { buildProductPath } from "@/lib/product-url";
import { listBrands } from "@/lib/queries/brands";

// Rendered at request time (not prerendered at build): the Docker build image
// has no SUPABASE_SERVICE_ROLE_KEY. The internal unstable_cache (6h) keeps the
// per-request cost to a single cached catalog scan.
export const dynamic = "force-dynamic";

// Sitemaps cap at 50,000 URLs per file. This catalog is well under that today;
// leave headroom for the static + supplier entries and warn (never silently
// truncate) if products ever approach the ceiling — at which point this should
// move to chunked `generateSitemaps()`.
const MAX_PRODUCT_URLS = 45000;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://silkroad.africa";
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

// Crawlers refetch /sitemap.xml regularly; cache the catalog scan so it doesn't
// re-run the full-table queries on every fetch. Uses the cookieless service
// client (required inside unstable_cache) and only reads public catalog data.
const getSitemapEntries = unstable_cache(
  async () => {
    const supabase = createServiceClient();

    const [products, suppliers, cats] = await Promise.all([
      fetchAllRows<{
        id: string;
        slug: string | null;
        origin_country: string | null;
        category_id: string | null;
        updated_at: string | null;
      }>((from, to) =>
        supabase
          .from("products")
          .select("id, slug, origin_country, category_id, updated_at")
          .eq("moderation_status", "approved")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .range(from, to)
      ),
      fetchAllRows<{ slug: string; updated_at: string | null }>((from, to) =>
        supabase
          .from("companies")
          .select("slug, updated_at")
          .eq("type", "supplier")
          .eq("is_active", true)
          .eq("verification_status", "verified")
          .range(from, to)
      ),
      fetchAllRows<{ id: string; path: string | null }>((from, to) =>
        supabase.from("categories").select("id, path").range(from, to)
      ),
    ]);

    // category_id → full ancestry path (e.g. "consumer-electronics/computer-peripherals")
    const catPath: Record<string, string | null> = {};
    for (const c of cats) catPath[c.id] = c.path;

    if (products.length > MAX_PRODUCT_URLS) {
      console.warn(
        `[sitemap] ${products.length} products exceed the ${MAX_PRODUCT_URLS} single-file cap — ` +
          `listing the ${MAX_PRODUCT_URLS} most recently updated. Move to chunked generateSitemaps().`
      );
    }

    return { products: products.slice(0, MAX_PRODUCT_URLS), suppliers, catPath };
  },
  ["sitemap-entries"],
  { revalidate: 21600, tags: ["catalog"] } // 6 hours
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();

  // Canonical, crawlable pages only — the faceted /marketplace?... URLs are
  // Disallowed in robots.ts, so they must never appear here.
  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: `${base}/`, changeFrequency: "daily", priority: 1.0 },
      { url: `${base}/marketplace`, changeFrequency: "daily", priority: 0.9 },
      { url: `${base}/brands`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${base}/suppliers`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${base}/commodities`, changeFrequency: "weekly", priority: 0.6 },
      { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/how-to-buy`, changeFrequency: "monthly", priority: 0.5 },
      { url: `${base}/resources`, changeFrequency: "weekly", priority: 0.5 },
      { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
      { url: `${base}/compliance`, changeFrequency: "monthly", priority: 0.3 },
      { url: `${base}/request-supplier-account`, changeFrequency: "monthly", priority: 0.3 },
      { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
      { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
      { url: `${base}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    ] satisfies MetadataRoute.Sitemap
  ).map((e) => ({ ...e, lastModified: now }));

  let products: {
    id: string;
    slug: string | null;
    origin_country: string | null;
    category_id: string | null;
    updated_at: string | null;
  }[] = [];
  let suppliers: { slug: string; updated_at: string | null }[] = [];
  let catPath: Record<string, string | null> = {};
  try {
    ({ products, suppliers, catPath } = await getSitemapEntries());
  } catch (err) {
    // DB unavailable (e.g. quota-restricted) — still emit the static sitemap.
    console.error("[sitemap] catalog fetch failed, emitting static routes only:", err);
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}${buildProductPath({
      id: p.id,
      slug: p.slug,
      origin_country: p.origin_country,
      category_path: p.category_id ? catPath[p.category_id] ?? null : null,
    })}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const supplierRoutes: MetadataRoute.Sitemap = suppliers.map((s) => ({
    url: `${base}/suppliers/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  let brandRoutes: MetadataRoute.Sitemap = [];
  try {
    const brands = await listBrands();
    brandRoutes = brands.map((b) => ({
      url: `${base}/brands/${b.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }));
  } catch (err) {
    console.error("[sitemap] brand list failed, skipping brand routes:", err);
  }

  return [...staticRoutes, ...productRoutes, ...supplierRoutes, ...brandRoutes];
}
