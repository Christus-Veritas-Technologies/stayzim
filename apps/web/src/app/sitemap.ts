import type { MetadataRoute } from "next";
import { normalizeDomain } from "@stayzim/sites";
import { headers } from "next/headers";

import { slugForCustomDomain } from "@/lib/custom-domains";
import { lodgeSlugFromHost, MAIN_URL, siteUrl } from "@/lib/site-host";

/** A lodge site is one page; StayZim's own domain has the landing page and the legal pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host");
  const subdomain = lodgeSlugFromHost(host);
  const ownDomain = subdomain ? null : await slugForCustomDomain(host);
  const slug = subdomain ?? ownDomain;
  const site = slug ? { slug, customDomain: ownDomain ? normalizeDomain(host) : null } : null;
  if (site) return [{ url: siteUrl(site), changeFrequency: "weekly", priority: 1 }];
  return [
    { url: MAIN_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${MAIN_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${MAIN_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
