/** The admin app's public settings, inlined at build time (validated by next.config.ts through @stayzim/env/admin). */
export const env = {
  NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL as string,
  NEXT_PUBLIC_WEB_URL: (process.env.NEXT_PUBLIC_WEB_URL as string).replace(/\/+$/, ""),
  NEXT_PUBLIC_SITES_DOMAIN: (process.env.NEXT_PUBLIC_SITES_DOMAIN || "stayzim.co.zw").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
};
