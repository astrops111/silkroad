import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker / Cloud Run
  // Lets the client detect a stale build after a Cloud Run deploy (old tab's
  // JS vs. new server) and force a full reload instead of RSC fetches 404ing.
  // See node_modules/next/dist/docs/.../deploymentId.md.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    if (process.env.REDIRECT_WWW_TO_APEX !== "true") return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.silkroad.africa" }],
        destination: "https://silkroad.africa/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Content-Security-Policy is emitted per-request by src/middleware.ts so
    // each response carries a unique nonce. Only static security headers live
    // here; CSP intentionally omitted to avoid conflicting with the nonce one.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
