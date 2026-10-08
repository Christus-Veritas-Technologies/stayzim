import type { SitePage } from "@stayzim/sites";
import type { Metadata } from "next";

import { getSite, type LiveSite } from "@/lib/site";
import { hasPage } from "@/lib/site-pages";

/*
 * Shared by the pages under app/sites/[slug]/ beyond the home page: the site,
 * if it's live and its plan has the page (else the page 404s), and the
 * metadata every one of them sets.
 */

export async function sitePageData(slug: string, page: SitePage): Promise<LiveSite | null> {
  const site = await getSite(slug);
  return site?.status === "LIVE" && hasPage(site, page) ? site : null;
}

export function sitePageMetadata(site: LiveSite | null, { title, description, url }: { title: string; description: string; url: string }): Metadata {
  if (!site) return { title: { absolute: "Not found" }, robots: { index: false } };
  return {
    title: { absolute: `${title} · ${site.name}` },
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · ${site.name}`, description, type: "website", url, images: site.heroUrl ? [{ url: site.heroUrl }] : undefined },
    other: { "theme-color": site.themeColor },
    // Demos come and go in 2 days: only paid sites go in search results
    ...(site.demo ? { robots: { index: false, follow: false } } : {}),
  };
}
