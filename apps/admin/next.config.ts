import "@stayzim/env/admin";
import type { NextConfig } from "next";

const local = /(^|\.)localhost(:\d+)?$/.test(process.env.NEXT_PUBLIC_SITES_DOMAIN ?? "stayzim.co.zw");

/** Team-only screens: no framing, no search engines, HTTPS only (except on localhost). */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
  ...(local ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The Docker builds set NEXT_BUILD_WORKERS=1: web and admin build side by side on the
  // VPS, and a worker per CPU each is more than its memory holds
  ...(process.env.NEXT_BUILD_WORKERS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_WORKERS) } } : {}),
  poweredByHeader: false,
  // Types are checked by `pnpm check-types` (next typegen + tsc), as in the web app
  typescript: { ignoreBuildErrors: true },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  // The WhatsApp engine (whatsapp-web.js drives Chromium through puppeteer) and the
  // database client run as plain Node modules on the server, not bundled
  serverExternalPackages: ["whatsapp-web.js", "puppeteer", "puppeteer-core", "qrcode", "sharp", "pg", "@prisma/client", "@prisma/adapter-pg"],
  transpilePackages: ["@stayzim/db", "@stayzim/env", "@stayzim/sites", "@stayzim/ui"],
  images: { remotePatterns: [new URL("https://cdn.stayzim.co.zw/**")] },
};

export default nextConfig;
