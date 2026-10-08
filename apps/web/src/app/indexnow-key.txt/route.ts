import { env } from "@stayzim/env/web";

// Read at request time, so the key can change without a rebuild
export const dynamic = "force-dynamic";

/**
 * The IndexNow key, on every host (stayzim.co.zw, lodge subdomains and own
 * domains: the proxy leaves paths with a dot alone). The API names this file
 * as keyLocation when it tells search engines about a site that went live.
 */
export function GET() {
  if (!env.INDEXNOW_KEY) return new Response("Not found", { status: 404 });
  return new Response(env.INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
