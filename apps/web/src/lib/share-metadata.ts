import type { Metadata } from "next";

import { lodgePlace } from "@/lib/lodge";
import { OG_SIZE, ogVersion } from "@/lib/og";
import type { LiveSite } from "@/lib/site";
import { MAIN_URL } from "@/lib/site-host";

/** The lodge's share card (/og/{slug}), versioned by what it shows so caches and WhatsApp pick up a change. */
export function lodgeCardUrl(site: LiveSite) {
  const prices = site.rooms.map((room) => room.price).join(",");
  return `${MAIN_URL}/og/${site.slug}?v=${ogVersion(site.name, lodgePlace(site), site.heroUrl, prices, site.booking.mode)}`;
}

/**
 * Open Graph and X (Twitter) tags for a page of a lodge site: the lodge's name as
 * the site name, Zimbabwe English, and its share card (or a page's own photo,
 * like a journal post's cover).
 */
export function lodgeShareMetadata(
  site: LiveSite,
  { title, description, url, type = "website", image }: { title: string; description: string; url: string; type?: "website" | "article"; image?: { url: string; alt: string } },
): Pick<Metadata, "openGraph" | "twitter"> {
  const images = [image ?? { url: lodgeCardUrl(site), ...OG_SIZE, alt: `${site.name}${lodgePlace(site) ? `, ${lodgePlace(site)}` : ""}` }];
  return {
    openGraph: { title, description, url, type, siteName: site.name, locale: "en_ZW", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
