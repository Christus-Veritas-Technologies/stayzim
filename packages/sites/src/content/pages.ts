/**
 * Which pages a lodge site has, by plan (docs/cms/pages.md). Starter is one
 * page; Growth adds rooms (and a page per room), the gallery and contact; Pro
 * adds the story, things to do, reviews and the journal. A page outside the
 * plan 404s, and the sitemap lists only the plan's pages.
 */
import type { Plan } from "../index";
import { slugFromName } from "../slugs";

export const SITE_PAGES = ["home", "rooms", "room", "gallery", "contact", "about", "experiences", "reviews", "journal"] as const;

export type SitePage = (typeof SITE_PAGES)[number];

export const PLAN_PAGES: Record<Plan, readonly SitePage[]> = {
  STARTER: ["home"],
  GROWTH: ["home", "rooms", "room", "gallery", "contact"],
  PRO: ["home", "rooms", "room", "gallery", "contact", "about", "experiences", "reviews", "journal"],
};

export function isSitePage(value: unknown): value is SitePage {
  return typeof value === "string" && (SITE_PAGES as readonly string[]).includes(value);
}

/**
 * Each room's address on the site (/rooms/{slug}), made from its name: the
 * same name twice gets -2, -3. Worked out from the rooms in their order, so it
 * needs nothing stored.
 */
export function roomSlugs(rooms: readonly { id: string; name: string }[]) {
  const taken = new Map<string, number>();
  const slugs = new Map<string, string>();
  for (const room of rooms) {
    const base = slugFromName(room.name) || "room";
    const count = (taken.get(base) ?? 0) + 1;
    taken.set(base, count);
    slugs.set(room.id, count === 1 ? base : `${base}-${count}`);
  }
  return slugs;
}
