import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { lodgeSlugFromHost, MAIN_URL, siteUrl } from "@/lib/site-host";

/** A lodge site is one page; StayZim's own domain has the landing page and the legal pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slug = lodgeSlugFromHost((await headers()).get("host"));
  if (slug) return [{ url: siteUrl({ slug }), changeFrequency: "weekly", priority: 1 }];
  return [
    { url: MAIN_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${MAIN_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${MAIN_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
