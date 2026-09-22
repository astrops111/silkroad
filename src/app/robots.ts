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
      // Meta's AI-training crawler ignored the wildcard rules below and
      // enumerated every faceted marketplace URL (up to 1.67M req/day),
      // saturating the database. It is also hard-blocked (403) in
      // src/proxy.ts; this rule is the polite version for the record.
      {
        userAgent: "meta-externalagent",
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/marketplace?", // faceted filter variants — crawler trap, not canonical
          "/api/",
          "/admin",
          "/superadmin",
          "/supplier/", // protected supplier dashboard — NOT the public /suppliers pages
        ],
      },
    ],
    host: base,
    sitemap: `${base}/sitemap.xml`,
  };
}
