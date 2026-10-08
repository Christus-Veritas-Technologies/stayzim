import type { MetadataRoute } from "next";
import { normalizeDomain } from "@stayzim/sites";
import { headers } from "next/headers";

import { slugForCustomDomain } from "@/lib/custom-domains";
import { journalUrl } from "@/components/site/journal";
import { getJournal, getSite } from "@/lib/site";
import { lodgeSlugFromHost, MAIN_URL, siteUrl } from "@/lib/site-host";
import { hasPage, pageUrl, roomUrl } from "@/lib/site-pages";

/** A lodge site lists its plan's pages (packages/sites content/pages.ts); StayZim's own domain has the landing page and the legal pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host");
  const subdomain = lodgeSlugFromHost(host);
  const ownDomain = subdomain ? null : await slugForCustomDomain(host);
  const slug = subdomain ?? ownDomain;
  const site = slug ? { slug, customDomain: ownDomain ? normalizeDomain(host) : null } : null;
  if (site) {
    const live = await getSite(site.slug);
    // Demos and offline sites aren't for search engines
    if (live?.status !== "LIVE" || live.demo) return [];
    // The plan's pages, a page per room (Growth and Pro), and on Pro the journal and each post
    const pages = (["rooms", "gallery", "contact", "about", "experiences", "reviews"] as const).filter((page) => hasPage(live, page));
    const rooms = hasPage(live, "room") ? live.rooms.map((room) => roomUrl({ ...live, ...site }, room.id)).filter((url): url is string => url !== null) : [];
    const posts = hasPage(live, "journal") ? await getJournal(site.slug) : null;
    return [
      { url: siteUrl(site), changeFrequency: "weekly", priority: 1 },
      ...pages.map((page) => ({ url: pageUrl(site, page), changeFrequency: "weekly" as const, priority: page === "rooms" ? 0.9 : 0.7 })),
      ...rooms.map((url) => ({ url, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...(posts
        ? [
            { url: journalUrl(site), changeFrequency: "weekly" as const, priority: 0.7 },
            ...posts.map((post) => ({ url: journalUrl(site, post.slug), lastModified: post.publishedOn, changeFrequency: "monthly" as const, priority: 0.6 })),
          ]
        : []),
    ];
  }
  return [
    { url: MAIN_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${MAIN_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${MAIN_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${MAIN_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
