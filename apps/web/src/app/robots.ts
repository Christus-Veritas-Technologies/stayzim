import type { MetadataRoute } from "next";
import { normalizeDomain } from "@stayzim/sites";
import { headers } from "next/headers";

import { slugForCustomDomain } from "@/lib/custom-domains";
import { getSite } from "@/lib/site";
import { lodgeSlugFromHost, MAIN_URL, siteUrl } from "@/lib/site-host";

/**
 * One robots.txt per host. A paid lodge site may be crawled in full; a demo
 * (or an offline site) not at all. On StayZim's own
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
    const live = await getSite(site.slug);
    if (live?.status !== "LIVE" || live.demo) return { rules: { userAgent: "*", disallow: "/" } };
    return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl(site)}/sitemap.xml` };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/login", "/forgot-password", "/reset-password", "/set-password", "/start", "/preview", "/sites"],
    },
    sitemap: `${MAIN_URL}/sitemap.xml`,
  };
}
