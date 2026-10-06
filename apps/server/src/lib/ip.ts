import type { Context } from "hono";
import { getConnInfo } from "hono/bun";

/** Behind a proxy the client IP is the first X-Forwarded-For hop; locally it's the socket address. */
export function clientIp(c: Context) {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}
