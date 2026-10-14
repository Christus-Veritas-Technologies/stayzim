import "@stayzim/env/web";
import type { NextConfig } from "next";

const sitesDomain = process.env.NEXT_PUBLIC_SITES_DOMAIN ?? "stayzim.co.zw";
const local = /(^|\.)localhost(:\d+)?$/.test(sitesDomain);
/** The team's screens moved to their own app (apps/admin) */
const adminUrl = local ? "http://localhost:9996" : `https://admin.${sitesDomain}`;

/**
 * Sent with every page: the landing page, dashboard and lodge sites.
 *
 * - Framing is same-origin only: the Design screen shows lodge previews in an iframe.
 * - The CSP is deliberately small. A full script policy needs a nonce on every
 *   page, which would stop Next from serving any page statically.
 * - HTTPS only (HSTS), except on localhost.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'",
  },
  ...(local ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  // The Docker builds set NEXT_BUILD_WORKERS=1: web and admin build side by side on the
  // VPS, and a worker per CPU each is more than its memory holds
  ...(process.env.NEXT_BUILD_WORKERS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_WORKERS) } } : {}),
  poweredByHeader: false,
  // `next build` skips its own type check; types are checked by `pnpm check-types`
  // (next typegen + tsc), which CI runs on every push
  typescript: { ignoreBuildErrors: true },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  // The team's old screens here, for bookmarks
  redirects: async () => [
    { source: "/admin/lodges/:slug", destination: `${adminUrl}/sites/:slug`, permanent: true },
    { source: "/admin/lodges", destination: `${adminUrl}/sites`, permanent: true },
    { source: "/admin/requests", destination: `${adminUrl}/requests`, permanent: true },
    { source: "/admin/:path*", destination: `${adminUrl}/`, permanent: true },
  ],
  // Lodge photos come from the R2 bucket's domain (R2_PUBLIC_URL on the server). Pages
  // show them with plain <img> and srcset (resized on upload), which needs no setting;
  // this lets next/image use them too.
  images: {
    remotePatterns: [new URL("https://cdn.stayzim.co.zw/**")],
  },
};

export default nextConfig;
