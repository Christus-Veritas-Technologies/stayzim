import { env } from "@stayzim/env/web";

/** Our own subdomains, never a lodge. Mirrored in apps/server/src/lib/sites.ts. */
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "media", "outreach", "help", "status", "demo"]);

/** Lodge sites live at {slug}.stayzim.co.zw (localhost:9999 in development). */
export const SITES_DOMAIN = env.NEXT_PUBLIC_SITES_DOMAIN.toLowerCase();

const SUFFIX = `.${SITES_DOMAIN}`;

export function siteHost(lodge: { slug: string }) {
  return `${lodge.slug}${SUFFIX}`;
}

/** StayZim's own site: https://stayzim.co.zw (http://localhost:9999 in development). */
export const MAIN_URL = `${SITES_DOMAIN.startsWith("localhost") ? "http" : "https"}://${SITES_DOMAIN}`;

export function siteUrl(lodge: { slug: string }) {
  return `${SITES_DOMAIN.startsWith("localhost") ? "http" : "https"}://${siteHost(lodge)}`;
}

/** "mistvalley.stayzim.co.zw" → "mistvalley"; the app's own hosts → null. */
export function lodgeSlugFromHost(host: string | null) {
  const value = host?.toLowerCase() ?? "";
  if (!value.endsWith(SUFFIX)) return null;
  const slug = value.slice(0, -SUFFIX.length);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || RESERVED.has(slug)) return null;
  return slug;
}
