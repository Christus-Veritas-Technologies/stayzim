import { env } from "@stayzim/env/server";
import type { Context } from "hono";
import { getConnInfo } from "hono/bun";

/**
 * The visitor's IP: from CLIENT_IP_HEADER behind a proxy (cf-connecting-ip behind
 * Cloudflare, else the first X-Forwarded-For hop), or the socket address locally.
 * better-auth reads the same header for sign-in rate limits (packages/auth).
 */
export function clientIp(c: Context) {
  const forwarded = c.req.header(env.CLIENT_IP_HEADER)?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}
