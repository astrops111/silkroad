import type { MetadataRoute } from "next";

/**
 * Robots directives (served at /robots.txt).
 *
 * The marketplace exposes faceted filter URLs (?category=, ?country=, ?brand=,
 * ?group=, ?limit=). Each is a distinct SSR render that re-runs the catalog
 * queries, so letting crawlers enumerate every filter combination is a classic
 * crawler trap that drives large, pointless database egress. We disallow any
 * /marketplace URL carrying a query string while keeping the canonical
 * /marketplace listing and /marketplace/<id> product pages fully crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://silkroad.africa";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/marketplace?", // faceted filter variants — crawler trap, not canonical
          "/api/",
          "/admin",
          "/superadmin",
          "/supplier",
        ],
      },
    ],
    host: base,
    sitemap: `${base}/sitemap.xml`,
  };
}
