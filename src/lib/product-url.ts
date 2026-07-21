/**
 * SEO-friendly product URLs:
 *   /marketplace/{region}/{category-path}/{product-slug}-{idPrefix}
 *
 * - region        → origin country slug (china, taiwan, south-korea, japan)
 * - category-path → the category's full ancestry path (e.g.
 *                   "consumer-electronics/computer-peripherals"), variable depth
 * - product-slug  → the product's slug (keyword-rich)
 * - idPrefix      → first two UUID groups ("xxxxxxxx-xxxx"); keeps the URL
 *                   unambiguous and resolvable without assuming globally-unique
 *                   slugs, via a UUID range query (idPrefixRange).
 */

const COUNTRY_SLUG: Record<string, string> = {
  CN: "china",
  TW: "taiwan",
  KR: "south-korea",
  JP: "japan",
};

export function regionSlug(originCountry?: string | null): string {
  if (!originCountry) return "global";
  return COUNTRY_SLUG[originCountry.toUpperCase()] ?? originCountry.toLowerCase();
}

function slugifyName(t: string): string {
  return (
    t
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "product"
  );
}

/** First two UUID groups: "33de40bf-8428". Collision-safe for the catalog. */
export function productIdPrefix(id: string): string {
  return id.slice(0, 13);
}

/** URL slug for a free-text brand name, e.g. "THE FACE SHOP" → "the-face-shop". */
export function brandSlug(brand: string): string {
  return (
    brand
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "brand"
  );
}

export interface ProductUrlInput {
  id: string;
  slug?: string | null;
  name?: string | null;
  origin_country?: string | null;
  category_path?: string | null;
}

export function buildProductPath(p: ProductUrlInput): string {
  const region = regionSlug(p.origin_country);
  const cat = (p.category_path && p.category_path.trim()) || "catalog";
  const nameSlug = (p.slug && p.slug.trim()) || slugifyName(p.name ?? "product");
  return `/marketplace/${region}/${cat}/${nameSlug}-${productIdPrefix(p.id)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** Pull the trailing "xxxxxxxx-xxxx" id prefix out of the last path segment. */
export function extractIdPrefix(lastSegment: string): string | null {
  const m = lastSegment.match(/([0-9a-f]{8}-[0-9a-f]{4})$/i);
  return m ? m[1].toLowerCase() : null;
}

/** UUID range [low, high] covering every id whose first 13 chars === prefix. */
export function idPrefixRange(prefix: string): { low: string; high: string } {
  return {
    low: `${prefix}-0000-0000-000000000000`,
    high: `${prefix}-ffff-ffff-ffffffffffff`,
  };
}
