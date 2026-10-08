import type { LiveSite, SitePostFull } from "@stayzim/sites";

import { lodgePlace } from "@/lib/lodge";
import { MAIN_URL, siteUrl } from "@/lib/site-host";
import { journalUrl } from "@/lib/site-pages";

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
    // The score guests gave on Google, Booking.com or the like (Pro), never the example reviews on a demo
    aggregateRating:
      site.reviews?.score && site.reviews.count && !site.samples.reviews
        ? { "@type": "AggregateRating", ratingValue: site.reviews.score, reviewCount: site.reviews.count, bestRating: 5 }
        : undefined,
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

/** schema.org data for a journal post (Pro): the article, by the lodge. */
export function postStructuredData(site: LiveSite, post: SitePostFull) {
  const lodge = { "@type": "LodgingBusiness", name: site.name, url: siteUrl(site) };
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedOn,
    url: journalUrl(site, post.slug),
    image: post.cover?.url,
    author: lodge,
    publisher: lodge,
    mainEntityOfPage: journalUrl(site, post.slug),
  };
}

/** schema.org data for StayZim's landing page: the company, and the site. */
export function stayzimStructuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "StayZim",
      legalName: "StayZim Platform Inc",
      url: MAIN_URL,
      logo: `${MAIN_URL}/email/stayzim-mark.png`,
      email: "hello@stayzim.co.zw",
      telephone: "+263775101506",
      address: { "@type": "PostalAddress", addressLocality: "Mutare", addressCountry: "ZW" },
      areaServed: "ZW",
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: "StayZim", url: MAIN_URL, inLanguage: "en-ZW" },
  ];
}
