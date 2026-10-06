import type { LiveSite } from "@stayzim/sites";

import { lodgePlace } from "@/lib/lodge";
import { siteUrl } from "@/lib/site-host";

/**
 * schema.org data for search engines: the lodge, its rooms and its questions.
 * Rendered once per lodge site page, outside the template, so every template has it.
 */
export function lodgeStructuredData(site: LiveSite) {
  const url = siteUrl(site);
  const place = lodgePlace(site);
  const lodge = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: site.name,
    url,
    description: site.description || undefined,
    image: site.heroUrl ?? undefined,
    telephone: site.phone ? `+${site.phone}` : site.whatsapp ? `+${site.whatsapp}` : undefined,
    email: site.email ?? undefined,
    address: place ? { "@type": "PostalAddress", addressLocality: site.town ?? undefined, addressRegion: site.region ?? undefined, addressCountry: "ZW" } : undefined,
    geo: site.latitude !== null && site.longitude !== null ? { "@type": "GeoCoordinates", latitude: site.latitude, longitude: site.longitude } : undefined,
    priceRange: site.rooms.length > 0 ? `$${Math.min(...site.rooms.map((room) => room.price))}+` : undefined,
    containsPlace: site.rooms.map((room) => ({
      "@type": "HotelRoom",
      name: room.name,
      description: room.description ?? undefined,
      bed: room.beds ?? undefined,
      occupancy: { "@type": "QuantitativeValue", maxValue: room.sleeps },
      floorSize: room.size === null ? undefined : { "@type": "QuantitativeValue", value: room.size, unitCode: "MTK" },
      image: room.photos[0]?.url,
    })),
  };
  return [lodge];
}

/** JSON for a <script type="application/ld+json">, safe to put in HTML. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
