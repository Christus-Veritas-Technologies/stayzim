import { env } from "@stayzim/env/web";
import { fillCopy, findTemplate, type LiveSite, type PublicSite, type Template } from "@stayzim/sites";
import { publicSiteSchema } from "@stayzim/sites/schemas";
import { cache } from "react";

import { lodgePlace } from "@/lib/lodge";

/** GET /api/sites/:slug: the contract shared with the server (packages/sites/src/content/types.ts). */
export type { LiveSite, PublicSite } from "@stayzim/sites";

/**
 * A lodge site's content, fresh on every request (owners' edits show "straight
 * away"). null for an unknown lodge. Cached per request, so the page and its
 * metadata share one fetch. Server-side only: it parses with zod.
 */
export const getSite = cache(async (slug: string): Promise<PublicSite | null> => {
  const api = env.SERVER_INTERNAL_URL ?? env.NEXT_PUBLIC_SERVER_URL;
  const response = await fetch(`${api}/api/sites/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Site ${slug} didn't load (${response.status})`);
  // Defaults fill fields an older API doesn't send yet; unknown ones are dropped
  return publicSiteSchema.parse(await response.json());
});

/**
 * The site as it would look in another template, for previews. Hero text the
 * owner wrote stays; text that is the live template's default becomes the
 * other template's default.
 */
export function withTemplate(site: LiveSite, template: Template): LiveSite {
  const live = findTemplate(site.template);
  const lodge = { name: site.name, place: lodgePlace(site) };
  const isDefault = (field: "headline" | "subline") => !live || site.hero[field] === fillCopy(live.defaults[field], lodge);
  return {
    ...site,
    template: template.key,
    hero: {
      headline: isDefault("headline") ? fillCopy(template.defaults.headline, lodge) : site.hero.headline,
      subline: isDefault("subline") ? fillCopy(template.defaults.subline, lodge) : site.hero.subline,
    },
  };
}

/** wa.me link to the lodge, with the room (or a general stay) typed in. */
export function bookingUrl(site: LiveSite, roomName?: string) {
  if (!site.whatsapp) return null;
  const text = roomName
    ? `Hi ${site.name}, I'd like to book the ${roomName}. My dates are: `
    : `Hi ${site.name}, I'd like to book a stay. My dates are: `;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
