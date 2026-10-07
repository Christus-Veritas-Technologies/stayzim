/**
 * The web app's public settings, inlined into the bundle at build time.
 *
 * They're validated once, when the app builds or starts (next.config.ts imports
 * @stayzim/env/web), so code that runs in the browser reads them from here and
 * guests' phones don't download a validation library for three strings. Server
 * code that needs a private setting imports @stayzim/env/web instead.
 */
export const env = {
  NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL as string,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || undefined,
  // "https://stayzim.co.zw/" is taken as "stayzim.co.zw"
  NEXT_PUBLIC_SITES_DOMAIN: (process.env.NEXT_PUBLIC_SITES_DOMAIN || "stayzim.co.zw").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
  NEXT_PUBLIC_META_PIXEL: process.env.NEXT_PUBLIC_META_PIXEL || undefined,
};
