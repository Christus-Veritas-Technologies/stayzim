import { env } from "@stayzim/env/web";
import { fillCopy, findTemplate, type Template } from "@stayzim/sites";
import { cache } from "react";

import { lodgePlace, type AmenityKey } from "@/lib/lodge";

/** GET /api/sites/:slug (mirrors PublicSite in apps/server/src/routes/sites.ts). */
export type PublicSite =
  | { status: "SUSPENDED" | "DEMO_ENDED"; slug: string; name: string }
  | {
      status: "LIVE";
      /** Not paid for yet: the site shows "This is a demo" badges */
      demo: boolean;
      slug: string;
      /** The lodge's own domain: its canonical address when set */
      customDomain: string | null;
      name: string;
      /** Template key from @stayzim/sites, already checked against the plan */
      template: string;
      hero: { headline: string; subline: string };
      description: string;
      town: string | null;
      region: string | null;
      whatsapp: string | null;
      phone: string | null;
      email: string | null;
      mapsUrl: string | null;
      latitude: number | null;
      longitude: number | null;
      themeColor: string;
      logoUrl: string | null;
      heroUrl: string | null;
      /** `srcset` for the hero, so phones get a smaller copy */
      heroSrcSet: string | null;
      rooms: {
        id: string;
        name: string;
        price: number;
        sleeps: number;
        amenities: AmenityKey[];
        photos: { url: string; srcSet: string | null; width: number; height: number }[];
      }[];
      gallery: { url: string; srcSet: string | null; width: number; height: number; caption: string }[];
    };

export type LiveSite = Extract<PublicSite, { status: "LIVE" }>;

/**
 * A lodge site's content, fresh on every request (owners' edits show "straight
 * away"). null for an unknown lodge. Cached per request, so the page and its
 * metadata share one fetch.
 */
export const getSite = cache(async (slug: string): Promise<PublicSite | null> => {
  const api = env.SERVER_INTERNAL_URL ?? env.NEXT_PUBLIC_SERVER_URL;
  const response = await fetch(`${api}/api/sites/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Site ${slug} didn't load (${response.status})`);
  return (await response.json()) as PublicSite;
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
