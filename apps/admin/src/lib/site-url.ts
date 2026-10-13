import { env } from "@/lib/public-env";

const local = /(^|\.)localhost(:\d+)?$/.test(env.NEXT_PUBLIC_SITES_DOMAIN);

/** A lodge's site address: its own domain when it has one, else {slug}.stayzim.co.zw. */
export function siteUrl(lodge: { slug: string; customDomain?: string | null }) {
  return `${local ? "http" : "https"}://${lodge.customDomain ?? `${lodge.slug}.${env.NEXT_PUBLIC_SITES_DOMAIN}`}`;
}

/** "mistvalley.stayzim.co.zw" (or the lodge's own domain), for showing. */
export function siteHost(lodge: { slug: string; customDomain?: string | null }) {
  return siteUrl(lodge).replace(/^https?:\/\//, "");
}
