import { env } from "@stayzim/env/server";

/** Subdomains of SITES_DOMAIN that are StayZim's own, never a lodge. Mirrored in packages/db/scripts/create-lodge.ts. */
export const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "mail", "media", "outreach", "help", "status", "demo"]);

const escaped = env.SITES_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SITE_ORIGIN = new RegExp(`^https?://([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\\.${escaped}$`, "i");

/** https://mistvalley.stayzim.co.zw → "mistvalley"; anything else → null. */
export function lodgeSlugFromOrigin(origin: string | undefined | null) {
  const match = origin?.match(SITE_ORIGIN);
  const slug = match?.[1]?.toLowerCase();
  return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null;
}

export function isLodgeSiteOrigin(origin: string | undefined | null) {
  return lodgeSlugFromOrigin(origin) !== null;
}

/** Phone, tablet or computer, and "Android, Chrome", from the user agent. Good enough for owners' charts. */
export function describeDevice(userAgent: string | undefined) {
  const ua = userAgent ?? "";
  const device = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua) ? "TABLET" : /Mobi|iPhone|Android/i.test(ua) ? "PHONE" : "COMPUTER";
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "iPhone"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS/i.test(ua)
          ? "Mac"
          : /Linux/i.test(ua)
            ? "Linux"
            : null;
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\/|Opera/i.test(ua)
      ? "Opera"
      : /SamsungBrowser/i.test(ua)
        ? "Samsung Internet"
        : /Chrome|CriOS/i.test(ua)
          ? "Chrome"
          : /Firefox|FxiOS/i.test(ua)
            ? "Firefox"
            : /Safari/i.test(ua)
              ? "Safari"
              : null;
  return { device: device as "PHONE" | "TABLET" | "COMPUTER", browser: [os, browser].filter(Boolean).join(", ") || null };
}
