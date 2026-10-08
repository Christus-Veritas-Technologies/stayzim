import { env } from "@stayzim/env/server";
import { PLAN_PAGES, type Plan } from "@stayzim/sites";

import { siteUrlFor } from "./sites";

/** The pages search engines are told about when a site goes live: home and the plan's other pages (rooms are found from there). */
export function indexNowUrls(lodge: { slug: string; customDomain: string | null; plan: Plan }) {
  const base = siteUrlFor(lodge);
  return PLAN_PAGES[lodge.plan].filter((page) => page !== "room").map((page) => (page === "home" ? base : `${base}/${page}`));
}

/**
 * Tells IndexNow (Bing, Yandex, Seznam, Naver; Google doesn't take part) about a
 * lodge's pages, so a site that has just gone live is crawled within hours.
 * Off without INDEXNOW_KEY and on localhost. Never throws: a failed ping only logs.
 */
export async function pingIndexNow(lodge: { slug: string; customDomain: string | null; plan: Plan }) {
  const urls = indexNowUrls(lodge);
  const base = new URL(urls[0]!);
  if (!env.INDEXNOW_KEY || base.protocol !== "https:") return false;
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: base.host, key: env.INDEXNOW_KEY, keyLocation: `${base.origin}/indexnow-key.txt`, urlList: urls }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok && response.status !== 202) console.warn(`[indexnow] ${base.host}: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.warn(`[indexnow] ${base.host}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
