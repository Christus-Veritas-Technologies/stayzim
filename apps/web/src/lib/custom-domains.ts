import { isStayZimHost } from "@/lib/site-host";

/** Recent answers: lodge slug, or null for a domain no lodge uses. */
const cache = new Map<string, { slug: string | null; until: number }>();
const FOUND_FOR_MS = 5 * 60 * 1000;
const MISSING_FOR_MS = 60 * 1000;

/**
 * The lodge whose own domain this host is ("www.mistvalleylodge.co.zw" →
 * "mistvalley"), asked of the API and cached for a few minutes. Null for
 * StayZim's own hosts and unknown domains. Server only: the proxy, robots and
 * the sitemap.
 */
export async function slugForCustomDomain(host: string | null) {
  if (!host || isStayZimHost(host)) return null;
  const key = host.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.slug;

  const api = process.env.SERVER_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SERVER_URL;
  let slug: string | null = null;
  try {
    const response = await fetch(`${api}/api/sites/domain/${encodeURIComponent(key)}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (response.ok) slug = ((await response.json()) as { slug: string }).slug;
    else if (response.status !== 404) return null; // The API had a problem: ask again next time
  } catch {
    return null;
  }
  if (cache.size > 5000) cache.clear();
  cache.set(key, { slug, until: Date.now() + (slug ? FOUND_FOR_MS : MISSING_FOR_MS) });
  return slug;
}
