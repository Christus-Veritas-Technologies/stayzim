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
    checkinTime: site.checkInFrom ?? undefined,
    checkoutTime: site.checkOutBy ?? undefined,
    sameAs: site.socialLinks.length > 0 ? site.socialLinks.map((link) => link.url) : undefined,
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
  const questions =
    site.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: site.faq.map((entry) => ({ "@type": "Question", name: entry.q, acceptedAnswer: { "@type": "Answer", text: entry.a } })),
        }
      : null;
  return questions ? [lodge, questions] : [lodge];
}

/** JSON for a <script type="application/ld+json">, safe to put in HTML. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org data for one room's page (/rooms/{room}). */
export function roomStructuredData(site: LiveSite, room: LiveSite["rooms"][number]) {
  return {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name: room.name,
    description: room.description ?? undefined,
    bed: room.beds ?? undefined,
    occupancy: { "@type": "QuantitativeValue", maxValue: room.sleeps },
    floorSize: room.size === null ? undefined : { "@type": "QuantitativeValue", value: room.size, unitCode: "MTK" },
    image: room.photos.map((photo) => photo.url),
    containedInPlace: { "@type": "LodgingBusiness", name: site.name, url: siteUrl(site) },
    offers: { "@type": "Offer", price: room.price, priceCurrency: "USD", unitText: "night" },
  };
}
