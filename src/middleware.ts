import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = [
  "/",
  "/about",
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

export async function middleware(request: NextRequest) {
  const rewriteUrl = rewriteForSubdomain(request);
  if (rewriteUrl) {
    return NextResponse.rewrite(rewriteUrl);
  }

  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Authenticated users trying to access auth pages -> redirect to dashboard
  if (user && authRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated users trying to access protected pages -> redirect to login
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest\\.json|sw\\.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
};
