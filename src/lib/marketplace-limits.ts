// Shared limits for the faceted /marketplace listing. Pure constants/helpers —
// imported by the edge proxy, the server page and the client sidebar, so keep
// it free of server-only or browser-only imports.

/**
 * Most brands a single listing request may filter on. Every distinct brand
 * combination is a cache miss that costs a full SSR render (listing + three
 * facet queries + category counts). Crawler waves on 2026-09-22 and
 * 2026-11-17 enumerated 4–8-brand combinations from thousands of IPs and took
 * the app down; real shoppers pick one to three. The proxy refuses requests
 * over the cap, and the sidebar stops offering a fourth checkbox.
 */
export const MAX_MARKETPLACE_BRANDS = 3;

/** Split a raw `?brand=` value into its non-empty entries (order preserved). */
export function parseBrandParam(raw: string | null | undefined): string[] {
  return raw ? raw.split(",").filter(Boolean) : [];
}

/**
 * Canonical brand list for querying: de-duplicated and sorted, so
 * `?brand=B,A` and `?brand=A,B,A` hit the same cache entry, capped as a
 * defence in depth behind the proxy check.
 */
export function normalizeBrands(raw: string | null | undefined): string[] | undefined {
  const unique = Array.from(new Set(parseBrandParam(raw))).sort();
  if (unique.length === 0) return undefined;
  return unique.slice(0, MAX_MARKETPLACE_BRANDS);
}
