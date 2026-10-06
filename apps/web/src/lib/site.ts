import { env } from "@stayzim/env/web";
import { cache } from "react";

import type { AmenityKey } from "@/lib/lodge";

/** GET /api/sites/:slug (mirrors PublicSite in apps/server/src/routes/sites.ts). */
export type PublicSite =
  | { status: "SUSPENDED"; slug: string; name: string }
  | {
      status: "LIVE";
      slug: string;
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
      rooms: {
        id: string;
        name: string;
        price: number;
        sleeps: number;
        amenities: AmenityKey[];
        photos: { url: string; width: number; height: number }[];
      }[];
      gallery: { url: string; width: number; height: number; caption: string }[];
    };

export type LiveSite = Extract<PublicSite, { status: "LIVE" }>;

/**
 * A lodge site's content, fresh on every request (owners' edits show "straight
 * away"). null for an unknown lodge. Cached per request, so the page and its
 * metadata share one fetch.
 */
export const getSite = cache(async (slug: string): Promise<PublicSite | null> => {
  const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/sites/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Site ${slug} didn't load (${response.status})`);
  return (await response.json()) as PublicSite;
});

/** wa.me link to the lodge, with the room (or a general stay) typed in. */
export function bookingUrl(site: LiveSite, roomName?: string) {
  if (!site.whatsapp) return null;
  const text = roomName
    ? `Hi ${site.name}, I'd like to book the ${roomName}. My dates are: `
    : `Hi ${site.name}, I'd like to book a stay. My dates are: `;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
