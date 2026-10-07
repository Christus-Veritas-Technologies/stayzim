import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@stayzim/env/server";

/**
 * A key per lodge that keeps the owner's own visits out of their numbers on
 * their own domain, where StayZim's session cookie isn't sent. The dashboard's
 * View site links carry it in the URL's #, the lodge site keeps it in that
 * browser and sends it with each event. It can only ever hide visits.
 */
export function ownerVisitKey(lodgeId: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET ?? "stayzim-local-owner-visits")
    .update(`owner-visits:${lodgeId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function isOwnerVisitKey(lodgeId: string, key: string | undefined) {
  if (!key) return false;
  const expected = Buffer.from(ownerVisitKey(lodgeId));
  const given = Buffer.from(key);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
