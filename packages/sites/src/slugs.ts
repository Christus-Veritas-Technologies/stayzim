/**
 * Lodge web addresses ({slug}.stayzim.co.zw): the rules, shared by sign-up, the
 * API, the web app's host routing and the scripts.
 */

/** Subdomains that are StayZim's own, never a lodge. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "www", "app", "api", "admin", "mail", "media", "outreach", "help", "status", "demo", "sites",
  "signup", "start", "login", "billing", "support", "blog", "docs", "static", "assets", "cdn",
  // /preview/sample/{template} and the example photos
  "sample", "samples",
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/** 3 to 40 lowercase letters, digits and hyphens, starting and ending with a letter or digit. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !slug.includes("--") && !RESERVED_SLUGS.has(slug);
}

/** Why a slug can't be used, in words for the owner, or null when it can. */
export function slugProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `Use at least ${SLUG_MIN} letters or numbers.`;
  if (slug.length > SLUG_MAX) return `Keep it to ${SLUG_MAX} characters.`;
  if (!/^[a-z0-9-]+$/.test(slug)) return "Use only lowercase letters, numbers and hyphens.";
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) return "Hyphens go between words only.";
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved. Try another.";
  return null;
}

/** "Mist Valley Lodge & Spa" → "mist-valley-lodge-and-spa", cut at a word to fit. */
export function slugFromName(name: string) {
  let slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > SLUG_MAX) {
    slug = slug.slice(0, SLUG_MAX);
    const lastHyphen = slug.lastIndexOf("-");
    if (lastHyphen >= SLUG_MIN) slug = slug.slice(0, lastHyphen);
    slug = slug.replace(/-+$/, "");
  }
  return slug;
}
