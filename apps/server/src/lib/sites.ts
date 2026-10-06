import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { normalizeDomain, RESERVED_SLUGS } from "@stayzim/sites";

const escaped = env.SITES_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SITE_ORIGIN = new RegExp(`^https?://([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\\.${escaped}$`, "i");

/** https://mistvalley.stayzim.co.zw → "mistvalley"; anything else → null. */
export function lodgeSlugFromOrigin(origin: string | undefined | null) {
  const match = origin?.match(SITE_ORIGIN);
  const slug = match?.[1]?.toLowerCase();
  return slug && !RESERVED_SLUGS.has(slug) ? slug : null;
}

export function isLodgeSiteOrigin(origin: string | undefined | null) {
  return lodgeSlugFromOrigin(origin) !== null;
}

/** Custom domains looked up recently: lodge slug, or null for "no lodge here". */
const domainCache = new Map<string, { slug: string | null; until: number }>();
const FOUND_FOR_MS = 5 * 60 * 1000;
const MISSING_FOR_MS = 60 * 1000;

/**
 * The lodge on a custom domain ("www.mistvalleylodge.co.zw" → "mistvalley"),
 * or null. Cached for a few minutes, since every lodge site request on a custom
 * domain asks; a domain set with set-domain.ts works within a minute or so.
 */
export async function slugForCustomDomain(host: string | null | undefined) {
  const domain = normalizeDomain(host);
  if (!domain) return null;
  const cached = domainCache.get(domain);
  if (cached && cached.until > Date.now()) return cached.slug;
  const lodge = await prisma.lodge.findUnique({ where: { customDomain: domain }, select: { slug: true, status: true } });
  // Own domains are for paying lodges; a demo is only on its stayzim.co.zw address
  const slug = lodge && lodge.status !== "DEMO" ? lodge.slug : null;
  if (domainCache.size > 5000) domainCache.clear();
  domainCache.set(domain, { slug, until: Date.now() + (slug ? FOUND_FOR_MS : MISSING_FOR_MS) });
  return slug;
}

/** A lodge site's origin: {slug}.SITES_DOMAIN, or a lodge's own domain. */
export async function isAnyLodgeSiteOrigin(origin: string | undefined | null) {
  if (isLodgeSiteOrigin(origin)) return true;
  if (!origin) return false;
  try {
    return (await slugForCustomDomain(new URL(origin).host)) !== null;
  } catch {
    return false;
  }
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

const SITE_PROTOCOL = /(^|\.)localhost(:\d+)?$/.test(env.SITES_DOMAIN) ? "http" : "https";

/** A lodge's public address, for emails: its own domain when it has one. */
export function siteUrlFor(lodge: { slug: string; customDomain?: string | null }) {
  return lodge.customDomain ? `https://${lodge.customDomain}` : `${SITE_PROTOCOL}://${lodge.slug}.${env.SITES_DOMAIN}`;
}

/** The owner dashboard on the web app, for links in emails. */
export const DASHBOARD_URL = `${(env.WEB_URL ?? env.CORS_ORIGIN[0]!).replace(/\/$/, "")}/dashboard`;
