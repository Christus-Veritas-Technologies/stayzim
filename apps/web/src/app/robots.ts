import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { lodgeSlugFromHost, MAIN_URL, siteUrl } from "@/lib/site-host";

/**
 * One robots.txt per host. A lodge site may be crawled in full. On StayZim's own
 * domain only the public pages may: the dashboard, team screen, sign-in pages
 * and template previews are private (they're also marked noindex).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const slug = lodgeSlugFromHost((await headers()).get("host"));
  if (slug) {
    return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl({ slug })}/sitemap.xml` };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/login", "/forgot-password", "/reset-password", "/set-password", "/preview", "/sites"],
    },
    sitemap: `${MAIN_URL}/sitemap.xml`,
  };
}
