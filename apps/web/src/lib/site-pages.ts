import { roomSlugs, type SitePage } from "@stayzim/sites";

import type { LiveSite } from "@/lib/site";
import { siteUrl } from "@/lib/site-host";

/*
 * Addresses of a lodge site's pages (packages/sites content/pages.ts): which
 * ones its plan has, and links that go to a page where there is one, else to
 * the section on the home page.
 */

type Linkable = Pick<LiveSite, "slug" | "customDomain" | "pages">;

export function hasPage(site: Pick<LiveSite, "pages">, page: SitePage) {
  return site.pages.includes(page);
}

/** A page on the lodge's own site: /rooms, /gallery. */
export function pageUrl(site: Pick<LiveSite, "slug" | "customDomain">, page: Exclude<SitePage, "home" | "room"> | "home") {
  return page === "home" ? siteUrl(site) : `${siteUrl(site)}/${page}`;
}

/** The page when the site has it, else the home page's section ("#rooms"). */
export function pageOr(site: Linkable, page: Exclude<SitePage, "home" | "room">, hash: `#${string}`) {
  return hasPage(site, page) ? pageUrl(site, page) : hash;
}

/** The journal's address on the lodge's own site: /journal, or /journal/{post}. */
export function journalUrl(site: Pick<LiveSite, "slug" | "customDomain">, post?: string) {
  return `${siteUrl(site)}/journal${post ? `/${post}` : ""}`;
}

/** A room's page: /rooms/{slug} (Growth and Pro). */
export function roomUrl(site: Pick<LiveSite, "slug" | "customDomain" | "rooms">, roomId: string) {
  const slug = roomSlugs(site.rooms).get(roomId);
  return slug ? `${siteUrl(site)}/rooms/${slug}` : null;
}

/** The room a /rooms/{slug} address names. */
export function roomBySlug(site: Pick<LiveSite, "rooms">, slug: string) {
  const slugs = roomSlugs(site.rooms);
  return site.rooms.find((room) => slugs.get(room.id) === slug.toLowerCase()) ?? null;
}
