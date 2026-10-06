import "@stayzim/env/web";
import type { NextConfig } from "next";

const sitesDomain = process.env.NEXT_PUBLIC_SITES_DOMAIN ?? "stayzim.co.zw";
const local = /(^|\.)localhost(:\d+)?$/.test(sitesDomain);

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
  poweredByHeader: false,
  // `next build` skips its own type check; types are checked by `pnpm check-types`
  // (next typegen + tsc), which CI runs on every push
  typescript: { ignoreBuildErrors: true },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default nextConfig;
