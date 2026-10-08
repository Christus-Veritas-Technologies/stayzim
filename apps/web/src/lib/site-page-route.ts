import type { SitePage } from "@stayzim/sites";
import type { Metadata, Route } from "next";
import { permanentRedirect } from "next/navigation";

import { getSite, type LiveSite } from "@/lib/site";
import { siteUrl } from "@/lib/site-host";
import { hasPage } from "@/lib/site-pages";
import { lodgeShareMetadata } from "@/lib/share-metadata";

/*
 * Shared by the pages under app/sites/[slug]/ beyond the home page: the site
 * if it's live (else the page 404s), a 308 to its home page when its plan
 * doesn't have the page, and the metadata every one of them sets.
 */

export async function sitePageData(slug: string, page: SitePage): Promise<LiveSite | null> {
  const site = await getSite(slug);
  if (site?.status !== "LIVE") return null;
  // A page the plan doesn't have (it may have had it before a cheaper plan): its home page, for good
  if (!hasPage(site, page)) permanentRedirect(siteUrl(site) as Route);
  return site;
}

export function sitePageMetadata(site: LiveSite | null, { title, description, url }: { title: string; description: string; url: string }): Metadata {
  if (!site) return { title: { absolute: "Not found" }, robots: { index: false } };
  return {
    title: { absolute: `${title} · ${site.name}` },
    description,
    alternates: { canonical: url },
    ...lodgeShareMetadata(site, { title: `${title} · ${site.name}`, description, url }),
    other: { "theme-color": site.themeColor },
    // Demos come and go in 2 days: only paid sites go in search results
    ...(site.demo ? { robots: { index: false, follow: false } } : {}),
  };
}
