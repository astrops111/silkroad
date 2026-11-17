import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { MAX_MARKETPLACE_BRANDS, parseBrandParam } from "@/lib/marketplace-limits";

const publicRoutes = [
  "/",
  "/about",
  "/how-it-works",
  "/how-to-buy",
  "/privacy",
  "/terms",
  "/compliance",
  "/cookies",
  "/commodities",
  "/marketplace",
  "/brands",
  "/request",
  "/request-export",
  "/suppliers",
  "/resources",
  "/sell",
  "/help",
  // Cart / quote builder is deliberately anonymous — guests build a cart and
  // request a quote without an account. Checkout stays gated.
  "/cart",
  // The quote submission itself. Without this, an anonymous POST is redirected
  // to the login page HTML and the form fails on JSON parse. The route
  // validates guest contact details and rate-limits by IP internally.
  "/api/rfqs/from-cart",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  // Public shopping/help chatbot — deliberately anonymous (rate-limited and
  // feature-flag gated inside the route). Without this, logged-out visitors'
  // POSTs are redirected to the login page HTML and the widget errors out.
  "/api/ai/assistant",
  // Navbar identity probe. It answers `{ user: null }` for anonymous
  // visitors, so gating it here would only redirect the fetch to the login
  // page HTML on every public page load.
  "/api/me",
];

const publicPrefixes = [
  "/marketplace/",
  "/brands/",
  "/suppliers/",
  "/resources/",
  "/commodities/",
  "/api/webhooks/",
  // Scheduled jobs are invoked by pg_cron → pg_net with a Bearer CRON_SECRET,
  // never with a session cookie. Every route under here verifies that secret
  // itself (timing-safe) and answers 401 on its own; without this exemption the
  // cookie gate below rejected all of them first, so no pg_cron job ever ran.
  "/api/cron/",
  "/privacy/",
  "/api/privacy/",
];

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

const authRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];

// Host-rewrite: `resources.<brand>` serves the /resources portal transparently.
// Skips rewriting for Next internals, API, and auth so those remain shared.
const RESOURCES_SUBDOMAIN = "resources.";

function rewriteForSubdomain(request: NextRequest): URL | null {
  const host = request.headers.get("host") ?? "";
  if (!host.startsWith(RESOURCES_SUBDOMAIN)) return null;

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/resources") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next")
  ) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/resources" : `/resources${pathname}`;
  return url;
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://js.stripe.com https://api.stripe.com https://api.flutterwave.com https://sandbox.momoapi.mtn.com https://proxy.momoapi.mtn.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Dev serves plain HTTP on localhost; upgrading would point the browser
    // at https://localhost and fail with ERR_SSL_PROTOCOL_ERROR.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const STRICT_CSP_ENABLED = process.env.DISABLE_STRICT_CSP !== "true";

// Crawlers refused outright. `meta-externalagent` (Meta's AI-training
// crawler) was measured at up to 1.67M requests/day from ~72 IPs, ignoring
// robots.txt and enumerating every faceted /marketplace?brand= combination —
// each an uncached SSR render against Supabase — which saturated the database
// (2026-09-22/23). Matched case-insensitively as a substring of User-Agent.
// `lightpanda` (headless scraping browser) arrived via Cloudflare on
// 2026-10-24 at 5k+ req/min, starving the instances badly enough that the
// in-process mail-sync cron timed out on every IMAP handshake.
// Note: `facebookexternalhit` (link previews) is deliberately NOT in this list.
// Override with a comma-separated BLOCKED_USER_AGENTS env var.
const BLOCKED_USER_AGENTS = (process.env.BLOCKED_USER_AGENTS ?? "meta-externalagent,lightpanda")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isBlockedUserAgent(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent")?.toLowerCase() ?? "";
  return ua !== "" && BLOCKED_USER_AGENTS.some((needle) => ua.includes(needle));
}

// Source-address block. Within a day of the UA block above, the same Meta
// crawler (identical 2a03:2880::/32 addresses, identical faceted-URL
// enumeration) came back under a plain Chrome-style User-Agent, so the UA
// check alone no longer holds. Matched as textual prefixes of the client IP
// (Cloud Run puts it first in X-Forwarded-For). Defaults are Meta's IPv6
// allocations only — every observed crawler hit was IPv6. Override with a
// comma-separated BLOCKED_IP_PREFIXES env var.
const BLOCKED_IP_PREFIXES = (process.env.BLOCKED_IP_PREFIXES ?? "2a03:2880:,2620:0:1c")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Meta's link-preview fetcher shares those addresses; keep social sharing
// working by exempting it from the IP block (it is not a bulk crawler).
const IP_BLOCK_EXEMPT_USER_AGENTS = ["facebookexternalhit"];

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return (first || request.headers.get("x-real-ip") || "").toLowerCase();
}

function isBlockedIp(request: NextRequest): boolean {
  if (BLOCKED_IP_PREFIXES.length === 0) return false;
  const ip = clientIp(request);
  if (!ip) return false;
  const ua = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (IP_BLOCK_EXEMPT_USER_AGENTS.some((needle) => ua.includes(needle))) return false;
  return BLOCKED_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

// Synthetic-URL block for the faceted marketplace listing. The third crawler
// wave (2026-09-27/28) came through Cloudflare with browser UAs from
// unlisted addresses, so neither check above matched — but every one of its
// ~50k URLs carried `featured=1`, a parameter nothing in this app emits.
// Any /marketplace request with a query key outside the set the listing
// page actually reads (see marketplace-client.tsx) is therefore fabricated
// and refused before it costs a render. Common ad/analytics click IDs are
// tolerated so marketing links keep working; add more via the
// comma-separated MARKETPLACE_EXTRA_PARAMS env var. Scoped to the exact
// `/marketplace` path — product and category pages take no filters.
const MARKETPLACE_PARAMS = new Set([
  "q", "category", "sub", "country", "group", "brand", "use", "page", "sort", "limit",
  "region", // footer region links (footer.tsx) — not read by the listing, but emitted
  "_rsc", // Next.js router-fetch marker
  "fbclid", "gclid", "msclkid", "ttclid", "ref",
  ...(process.env.MARKETPLACE_EXTRA_PARAMS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]);

function hasSyntheticMarketplaceQuery(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/marketplace") return false;
  for (const key of searchParams.keys()) {
    if (MARKETPLACE_PARAMS.has(key)) continue;
    if (key.startsWith("utm_")) continue;
    return true;
  }
  // Brand-combination enumeration (2026-11-17 wave): 4–8 brands per URL, each a
  // distinct uncached render. The sidebar never offers more than the cap.
  if (parseBrandParam(searchParams.get("brand")).length > MAX_MARKETPLACE_BRANDS) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  // Cheapest possible rejection: no session lookup, no render, no DB hit.
  // Runs before the prefetch pass-through below on purpose: the crawler
  // executes JS, so Next's <Link> prefetches (`?_rsc=…` + Next-Router-Prefetch
  // header) were slipping past a matcher-level exemption and still rendering
  // full faceted pages server-side.
  if (
    isBlockedUserAgent(request) ||
    isBlockedIp(request) ||
    hasSyntheticMarketplaceQuery(request)
  ) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }

  // Router prefetches skip session refresh / auth redirects (same behaviour
  // the matcher's former `missing` clause provided, now applied after the
  // UA block).
  if (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return NextResponse.next();
  }

  const nonce = STRICT_CSP_ENABLED ? generateNonce() : null;
  const csp = nonce ? buildCspHeader(nonce) : null;

  const forwardedHeaders = new Headers(request.headers);
  if (nonce && csp) {
    forwardedHeaders.set("x-nonce", nonce);
    forwardedHeaders.set("Content-Security-Policy", csp);
  }

  const rewriteUrl = rewriteForSubdomain(request);
  if (rewriteUrl) {
    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: forwardedHeaders },
    });
    if (csp) response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const { supabaseResponse, user } = await updateSession(
    request,
    nonce ? forwardedHeaders : undefined
  );
  const { pathname } = request.nextUrl;

  if (user && authRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    if (csp) redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  if (!user && !isPublicRoute(pathname)) {
    // fetch() callers can't use a login redirect — they'd follow it and choke
    // on the login page HTML (or, with upgrade-insecure-requests, an SSL
    // error). Gated APIs answer 401 JSON; only document navigations redirect.
    if (pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      if (csp) unauthorized.headers.set("Content-Security-Policy", csp);
      return unauthorized;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(url);
    if (csp) redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  if (csp) supabaseResponse.headers.set("Content-Security-Policy", csp);
  return supabaseResponse;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest\\.json|sw\\.js|icons/.*|fonts/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|woff2?|ttf)$).*)",
      // Prefetch requests are no longer excluded here — the blocked-UA check
      // must see them too. proxy() short-circuits them right after that check.
    },
  ],
};
