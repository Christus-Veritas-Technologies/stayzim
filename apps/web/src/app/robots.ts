import type { MetadataRoute } from "next";
import { normalizeDomain } from "@stayzim/sites";
import { headers } from "next/headers";

import { slugForCustomDomain } from "@/lib/custom-domains";
import { lodgeSlugFromHost, MAIN_URL, siteUrl } from "@/lib/site-host";

/**
 * One robots.txt per host. A lodge site may be crawled in full. On StayZim's own
 * domain only the public pages may: the dashboard, team screen, sign-in pages
 * and template previews are private (they're also marked noindex).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  const subdomain = lodgeSlugFromHost(host);
  const ownDomain = subdomain ? null : await slugForCustomDomain(host);
  const slug = subdomain ?? ownDomain;
  const site = slug ? { slug, customDomain: ownDomain ? normalizeDomain(host) : null } : null;
  if (site) {
    return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl(site)}/sitemap.xml` };
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
