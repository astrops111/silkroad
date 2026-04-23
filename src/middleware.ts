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
  "/suppliers",
  "/resources",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
];

const publicPrefixes = [
  "/marketplace/",
  "/suppliers/",
  "/resources/",
  "/commodities/",
  "/api/webhooks/",
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
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
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

export async function middleware(request: NextRequest) {
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
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest\\.json|sw\\.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
