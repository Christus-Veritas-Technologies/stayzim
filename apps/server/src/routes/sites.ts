import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { findTemplate, heroText } from "@stayzim/sites";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { clientIp } from "../lib/ip";
import { lodgeJson } from "../lib/lodge";
import { withSession, type AuthVariables } from "../lib/session";
import { describeDevice } from "../lib/sites";

/** What a lodge site shows. Nothing about the plan, billing or the owner. */
export type PublicSite =
  | { status: "SUSPENDED"; slug: string; name: string }
  | {
      status: "LIVE";
      slug: string;
      name: string;
      /** Template key from @stayzim/sites, already checked against the plan */
      template: string;
      hero: { headline: string; subline: string };
      description: string;
      town: string | null;
      region: string | null;
      whatsapp: string | null;
      phone: string | null;
      email: string | null;
      mapsUrl: string | null;
      latitude: number | null;
      longitude: number | null;
      themeColor: string;
      logoUrl: string | null;
      heroUrl: string | null;
      /** `srcset` for the hero, so phones get the 1024px copy */
      heroSrcSet: string | null;
      rooms: {
        id: string;
        name: string;
        price: number;
        sleeps: number;
        amenities: string[];
        photos: { url: string; srcSet: string | null; width: number; height: number }[];
      }[];
      gallery: { url: string; srcSet: string | null; width: number; height: number; caption: string }[];
    };

const eventSchema = z.object({
  type: z.enum(["PAGE_VIEW", "BOOKING_CHAT"]),
  visitorId: z.uuid(),
  path: z.string().max(512),
  roomId: z.string().max(64).optional(),
  referrer: z.string().max(1024).optional(),
});

/** Cloudflare adds CF-IPCountry when the site is proxied through it. XX and T1 mean unknown and Tor. */
function countryFrom(header: string | undefined) {
  const code = header?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

/** /api/sites: public, for lodge sites ({slug}.stayzim.co.zw). */
export const sites = new Hono<{ Variables: AuthVariables }>()
  /** The lodge's site content. 404 for an unknown lodge; a short answer for a suspended one. */
  .get("/:slug", async (c) => {
    const lodge = await prisma.lodge.findUnique({ where: { slug: c.req.param("slug").toLowerCase() }, select: { id: true, status: true } });
    if (!lodge) return c.json({ error: "No lodge here" }, 404);

    const full = await lodgeJson(lodge.id);
    if (lodge.status === "SUSPENDED") {
      return c.json({ status: "SUSPENDED", slug: full.slug, name: full.name } satisfies PublicSite);
    }
    const place = [full.town, full.region].filter(Boolean).join(", ") || null;
    return c.json({
      status: "LIVE",
      slug: full.slug,
      name: full.name,
      template: full.siteTemplate,
      hero: heroText(findTemplate(full.siteTemplate)!, { ...full, place }),
      description: full.description,
      town: full.town,
      region: full.region,
      whatsapp: full.whatsapp,
      phone: full.phone,
      email: full.email,
      mapsUrl: full.mapsUrl,
      latitude: full.latitude,
      longitude: full.longitude,
      themeColor: full.themeColor,
      logoUrl: full.logoUrl,
      heroUrl: full.heroUrl,
      heroSrcSet: full.heroSrcSet,
      rooms: full.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        price: room.price,
        sleeps: room.sleeps,
        amenities: room.amenities,
        photos: room.photos.map(({ url, srcSet, width, height }) => ({ url, srcSet, width, height })),
      })),
      gallery: full.gallery.map(({ url, srcSet, width, height, caption }) => ({ url, srcSet, width, height, caption })),
    } satisfies PublicSite);
  })

  /**
   * A page view or a Book on WhatsApp tap. The owner's (and StayZim staff's)
   * own visits are skipped, so their numbers are guests only.
   */
  .post(
    "/:slug/events",
    rateLimiter({ windowMs: 60_000, limit: 60, standardHeaders: "draft-7", keyGenerator: clientIp }),
    bodyLimit({ maxSize: 4 * 1024 }),
    withSession,
    zValidator("json", eventSchema),
    async (c) => {
      const event = c.req.valid("json");
      const lodge = await prisma.lodge.findUnique({
        where: { slug: (c.req.param("slug") ?? "").toLowerCase() },
        select: { id: true, ownerId: true, status: true },
      });
      if (!lodge || lodge.status === "SUSPENDED") return c.body(null, 204);

      const user = c.get("user");
      if (user && (user.id === lodge.ownerId || user.role === "ADMIN")) return c.body(null, 204);

      if (event.roomId) {
        const room = await prisma.room.findFirst({ where: { id: event.roomId, lodgeId: lodge.id }, select: { id: true } });
        if (!room) event.roomId = undefined;
      }

      const userAgent = c.req.header("user-agent");
      const { device, browser } = describeDevice(userAgent);
      await prisma.siteEvent.create({
        data: {
          lodgeId: lodge.id,
          type: event.type,
          visitorId: event.visitorId,
          path: event.path,
          roomId: event.roomId ?? null,
          referrer: event.referrer || null,
          country: countryFrom(c.req.header("cf-ipcountry")),
          device,
          browser,
          ip: clientIp(c),
        },
      });
      return c.body(null, 204);
    },
  );
