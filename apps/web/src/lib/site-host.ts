import { RESERVED_SLUGS } from "@stayzim/sites";

import { env } from "@/lib/public-env";

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

const MAIN_HOSTNAME_IS_LOCALHOST = /^localhost(:\d+)?$/.test(SITES_DOMAIN);

/** StayZim's own site: https://stayzim.co.zw (http://localhost:9999 in development). */
export const MAIN_URL = `${PROTOCOL}://${SITES_DOMAIN}`;

/** The team's admin app: https://admin.stayzim.co.zw (http://localhost:9996 in development). */
export const ADMIN_URL = PROTOCOL === "http" ? "http://localhost:9996" : `https://admin.${SITES_DOMAIN}`;

/**
 * Other names for the main site, sent on to it: StayZim lives on the bare domain only.
 * Not on plain localhost, where Next.js would turn the redirect into a relative one (a loop).
 */
const MAIN_ALIASES = new Set(MAIN_HOSTNAME_IS_LOCALHOST ? [] : ["www", "app"].map((name) => `${name}${SUFFIX}`));

/** "www.stayzim.co.zw/login?x=1" → "https://stayzim.co.zw/login?x=1"; any other host → null. */
export function mainSiteRedirect(host: string | null, pathAndQuery: string) {
  return MAIN_ALIASES.has((host ?? "").toLowerCase()) ? `${MAIN_URL}${pathAndQuery}` : null;
}

export function siteUrl(lodge: SiteAddress) {
  return `${PROTOCOL}://${siteHost(lodge)}`;
}

/** "mistvalley.stayzim.co.zw" → "mistvalley"; the app's own hosts → null. */
export function lodgeSlugFromHost(host: string | null) {
  const value = host?.toLowerCase() ?? "";
  if (!value.endsWith(SUFFIX)) return null;
  const slug = value.slice(0, -SUFFIX.length);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

/**
 * "admin.stayzim.co.zw" → "admin": one of StayZim's own reserved names
 * (api, admin, ...), served by another service. Only reaches the web app
 * when that service isn't running (or has no route), so it must not look like
 * the main site. The main site's aliases (www., app.) → null.
 */
export function reservedSubdomain(host: string | null) {
  const value = host?.toLowerCase() ?? "";
  if (!value.endsWith(SUFFIX) || MAIN_ALIASES.has(value)) return null;
  const name = value.slice(0, -SUFFIX.length);
  return RESERVED_SLUGS.has(name) ? name : null;
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

