import { env } from "@/lib/public-env";

/** Our own subdomains, never a lodge. Mirrored in apps/server/src/lib/sites.ts. */
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "media", "outreach", "help", "status", "demo"]);

/** Lodge sites live at {slug}.stayzim.co.zw (localhost:9999 in development). */
export const SITES_DOMAIN = env.NEXT_PUBLIC_SITES_DOMAIN.toLowerCase();

const SUFFIX = `.${SITES_DOMAIN}`;

/** Plain http for local development (localhost, or names under it like stayzim.localhost); https everywhere else. */
const PROTOCOL = /(^|\.)localhost(:\d+)?$/.test(SITES_DOMAIN) ? "http" : "https";

/** The port in development (":9999"), so local custom domains keep it. */
const DEV_PORT = PROTOCOL === "http" ? (SITES_DOMAIN.match(/:\d+$/)?.[0] ?? "") : "";

type SiteAddress = { slug: string; customDomain?: string | null };

/** "mistvalley.stayzim.co.zw": every lodge has this address. */
export function subdomainHost(lodge: { slug: string }) {
  return `${lodge.slug}${SUFFIX}`;
}

/** Where guests find the lodge: its own domain when StayZim has set one up, else its subdomain. */
export function siteHost(lodge: SiteAddress) {
  return lodge.customDomain ? `${lodge.customDomain}${DEV_PORT}` : subdomainHost(lodge);
}

/** StayZim's own site: https://stayzim.co.zw (http://localhost:9999 in development). */
export const MAIN_URL = `${PROTOCOL}://${SITES_DOMAIN}`;

export function siteUrl(lodge: SiteAddress) {
  return `${PROTOCOL}://${siteHost(lodge)}`;
}

/** "mistvalley.stayzim.co.zw" → "mistvalley"; the app's own hosts → null. */
export function lodgeSlugFromHost(host: string | null) {
  const value = host?.toLowerCase() ?? "";
  if (!value.endsWith(SUFFIX)) return null;
  const slug = value.slice(0, -SUFFIX.length);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || RESERVED.has(slug)) return null;
  return slug;
}

const MAIN_HOSTNAME = SITES_DOMAIN.replace(/:\d+$/, "");

/**
 * Hosts that are StayZim's own (the main domain and its subdomains), local or
 * internal addresses (localhost, an IP, a Docker service name): never a lodge's
 * own domain. Anything else might be one.
 */
export function isStayZimHost(host: string | null) {
  const name = (host ?? "").toLowerCase().replace(/:\d+$/, "");
  if (!name.includes(".") || name === "localhost" || /^[\d.]+$/.test(name) || name.startsWith("[")) return true;
  return name === MAIN_HOSTNAME || name.endsWith(`.${MAIN_HOSTNAME}`);
}

