import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

export async function proxy(request: NextRequest) {
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
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
