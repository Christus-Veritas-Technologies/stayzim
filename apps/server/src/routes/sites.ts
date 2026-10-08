import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { bookingConfirmedEmail, bookingRequestEmail } from "@stayzim/mail/templates";
import {
  BOOKING_LIMITS,
  canHold,
  dateAdd,
  dateOnly,
  dateValue,
  demoEnded,
  findTemplate,
  formatDay,
  formatStay,
  fullNights,
  applySamples,
  copyForLodge,
  heroText,
  isSetting,
  NO_SAMPLES,
  PLAN_PAGES,
  samplePosts,
  welcomeDescription,
  isDateString,
  nightsBetween,
  SOCIAL_KEYS,
  SOCIAL_NETWORKS,
  todayInHarare,
  type Plan,
  type LiveSite,
  type PublicSite,
  type SiteAvailability,
} from "@stayzim/sites";
import { bookingRequestInput } from "@stayzim/sites/schemas";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { sendQuietly } from "../lib/billing";
import { bookingReference, bookingsEnabled, checkWindow, claimRooms, HOLDING, holdsFor } from "../lib/bookings";
import { clientIp } from "../lib/ip";
import { proContent, publishedPost, publishedPosts } from "../lib/content";
import { lodgeJson } from "../lib/lodge";
import { withSession, type AuthVariables } from "../lib/session";
import { isOwnerVisitKey } from "../lib/owner-key";
import { newReference } from "../lib/reference";
import { DASHBOARD_URL, describeDevice, slugForCustomDomain } from "../lib/sites";
import { validJson } from "../lib/validate";

/** What a lodge site shows (the PublicSite contract in @stayzim/sites). Nothing about the plan, billing or the owner. */
export type { PublicSite } from "@stayzim/sites";

const eventSchema = z.object({
  type: z.enum(["PAGE_VIEW", "BOOKING_CHAT"]),
  visitorId: z.uuid(),
  path: z.string().max(512),
  roomId: z.string().max(64).optional(),
  referrer: z.string().max(1024).optional(),
  /** The owner's browser on their own domain (lib/owner-key.ts) */
  ownerKey: z.string().max(64).optional(),
});

/** Guests can send booking requests: the plan has the calendar, and there's a WhatsApp number and a room to book. */
function requestMode(lodge: { plan: Plan; whatsapp: string | null; rooms: { visible: boolean }[] }) {
  return bookingsEnabled(lodge.plan) && Boolean(lodge.whatsapp) && lodge.rooms.some((room) => room.visible);
}

/** A lodge whose site is up and takes requests, or null (404, the same as an unknown site). */
/** A live Pro lodge, the only kind with a journal. */
async function journalLodge(slug: string) {
  const lodge = await prisma.lodge.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true, plan: true, status: true, demoEndsAt: true, name: true, town: true, setting: true },
  });
  if (!lodge || lodge.plan !== "PRO" || lodge.status === "SUSPENDED") return null;
  return demoEnded(lodge, new Date()) ? null : lodge;
}

/** A Pro demo's example journal posts (packages/sites samples). */
function demoPosts(lodge: { name: string; town: string | null; setting: string | null }) {
  return samplePosts({ name: lodge.name, town: lodge.town, setting: isSetting(lodge.setting) ? lodge.setting : null, publishedOn: todayInHarare() });
}

async function bookableLodge(slug: string) {
  const lodge = await prisma.lodge.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      id: true,
      slug: true,
      customDomain: true,
      name: true,
      plan: true,
      status: true,
      demoEndsAt: true,
      whatsapp: true,
      ownerId: true,
      autoConfirmBookings: true,
      email: true,
      checkInFrom: true,
      checkOutBy: true,
      owner: { select: { name: true, email: true } },
      rooms: { where: { visible: true }, orderBy: { position: "asc" }, select: { id: true, name: true, units: true, price: true, sleeps: true, visible: true } },
    },
  });
  if (!lodge || lodge.status === "SUSPENDED" || demoEnded(lodge, new Date()) || !requestMode(lodge)) return null;
  return lodge;
}

const availabilityQuery = z.object({ from: z.string().refine(isDateString), days: z.coerce.number().int().min(1).max(BOOKING_LIMITS.availabilityDays).default(BOOKING_LIMITS.availabilityDays) });

/** Cloudflare adds CF-IPCountry when the site is proxied through it. XX and T1 mean unknown and Tor. */
function countryFrom(header: string | undefined) {
  const code = header?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

/** /api/sites: public, for lodge sites ({slug}.stayzim.co.zw). */
export const sites = new Hono<{ Variables: AuthVariables }>()
  /**
   * Which lodge a custom domain belongs to, for the web app's proxy:
   * { slug } or 404. "www." and the port are ignored.
   */
  .get("/domain/:host", async (c) => {
    const slug = await slugForCustomDomain(c.req.param("host"));
    if (!slug) return c.json({ error: "No lodge on this domain" }, 404);
    c.header("Cache-Control", "public, max-age=60");
    return c.json({ slug });
  })

  /** The lodge's site content. 404 for an unknown lodge; a short answer for a suspended one or an ended demo. */
  .get("/:slug", async (c) => {
    const lodge = await prisma.lodge.findUnique({
      where: { slug: c.req.param("slug").toLowerCase() },
      select: { id: true, status: true, plan: true, reviewScore: true, reviewCount: true, reviewSource: true, reviewUrl: true },
    });
    if (!lodge) return c.json({ error: "No lodge here" }, 404);

    const full = await lodgeJson(lodge.id);
    if (lodge.status === "SUSPENDED" || full.demoEnded) {
      return c.json({ status: full.demoEnded ? "DEMO_ENDED" : "SUSPENDED", slug: full.slug, name: full.name } satisfies PublicSite);
    }
    const place = [full.town, full.region].filter(Boolean).join(", ") || null;
    // Generated text for every section; the owner's own hero and description win
    const copy = copyForLodge(full, heroText(findTemplate(full.siteTemplate)!, { ...full, place }));
    const site: LiveSite = {
      status: "LIVE",
      demo: lodge.status === "DEMO",
      slug: full.slug,
      customDomain: full.customDomain,
      name: full.name,
      template: full.siteTemplate,
      hero: { headline: full.heroHeadline?.trim() || copy.hero.headline, subline: full.heroSubline?.trim() || copy.hero.subline },
      description: full.description.trim() || welcomeDescription(copy),
      town: full.town,
      region: full.region,
      country: full.country,
      kind: full.kind,
      setting: full.setting,
      copy,
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
      // Hidden rooms never reach a template
      rooms: full.rooms
        .filter((room) => room.visible)
        .map((room) => ({
          id: room.id,
          name: room.name,
          price: room.price,
          sleeps: room.sleeps,
          amenities: room.amenities,
          photos: room.photos.map(({ url, srcSet, width, height }) => ({ url, srcSet, width, height })),
          description: room.description,
          beds: room.beds,
          size: room.size,
          sample: false,
        })),
      gallery: full.gallery.map(({ url, srcSet, width, height, caption }) => ({ url, srcSet, width, height, caption })),
      checkInFrom: full.checkInFrom,
      checkOutBy: full.checkOutBy,
      houseRules: full.houseRules,
      cancellationPolicy: full.cancellationPolicy,
      faq: full.faq,
      socialLinks: SOCIAL_KEYS.flatMap((key) => {
        const url = full.socialLinks[key];
        return url ? [{ key, label: SOCIAL_NETWORKS[key].label, url }] : [];
      }),
      booking: { mode: requestMode(full) ? "request" : "whatsapp" },
      ...(await proContent(lodge)),
      samples: NO_SAMPLES,
      pages: [...PLAN_PAGES[lodge.plan]],
    };
    // A demo shows example rooms, photos, guest info and (Pro) reviews and posts wherever the owner has none yet
    return c.json(applySamples(site, { roomsHint: full.roomsHint, priceHint: full.priceHint, pro: lodge.plan === "PRO", today: todayInHarare() }) satisfies PublicSite);
  })

  /** Pro: every published journal post, newest first. */
  .get("/:slug/journal", async (c) => {
    const lodge = await journalLodge(c.req.param("slug"));
    if (!lodge) return c.json({ error: "No journal here" }, 404);
    const posts = await publishedPosts(lodge.id);
    if (posts.length === 0 && lodge.status === "DEMO") {
      return c.json({ posts: demoPosts(lodge).map(({ body: _body, ...post }) => post) });
    }
    return c.json({ posts });
  })

  /** Pro: one journal post with its body. */
  .get("/:slug/journal/:post", async (c) => {
    const lodge = await journalLodge(c.req.param("slug"));
    const slug = c.req.param("post").toLowerCase();
    let post = lodge ? await publishedPost(lodge.id, slug) : null;
    // A demo with no posts of its own shows the example ones
    if (!post && lodge?.status === "DEMO" && (await publishedPosts(lodge.id)).length === 0) post = demoPosts(lodge).find((entry) => entry.slug === slug) ?? null;
    if (!post) return c.json({ error: "No post here" }, 404);
    return c.json(post);
  })

  /** The nights each room is full, for the guest's date picker. No guest data, ever. */
  .get("/:slug/availability", async (c) => {
    const lodge = await bookableLodge(c.req.param("slug"));
    if (!lodge) return c.json({ error: "No lodge here" }, 404);
    const parsed = availabilityQuery.safeParse(c.req.query());
    const today = todayInHarare();
    const from = parsed.success && parsed.data.from > today ? parsed.data.from : today;
    const to = dateAdd(from, parsed.success ? parsed.data.days : BOOKING_LIMITS.availabilityDays);
    const holds = await prisma.booking.findMany({
      where: { lodgeId: lodge.id, ...HOLDING, checkIn: { lt: dateValue(to) }, checkOut: { gt: dateValue(from) } },
      select: { roomId: true, checkIn: true, checkOut: true, quantity: true },
    });
    const rooms = lodge.rooms.map((room) => ({
      id: room.id,
      full: fullNights(
        room.units,
        holds.filter((hold) => hold.roomId === room.id).map((hold) => ({ checkIn: dateOnly(hold.checkIn), checkOut: dateOnly(hold.checkOut), quantity: hold.quantity })),
        from,
        to,
      ),
    }));
    c.header("Cache-Control", "public, max-age=60");
    return c.json({ from, to, rooms } satisfies SiteAvailability);
  })

  /**
   * A guest's booking request. It holds no rooms: the owner confirms it. The
   * owner gets an email; the guest is offered WhatsApp with the reference.
   */
  .post(
    "/:slug/bookings",
    rateLimiter({ windowMs: 10 * 60_000, limit: 5, standardHeaders: "draft-7", keyGenerator: clientIp }),
    bodyLimit({ maxSize: 8 * 1024 }),
    withSession,
    validJson(bookingRequestInput),
    async (c) => {
      const input = c.req.valid("json");
      const lodge = await bookableLodge(c.req.param("slug") ?? "");
      if (!lodge) return c.json({ error: "This lodge isn't taking requests here. Message them on WhatsApp." }, 404);
      // Bots fill in every field: answer as if it worked, keep nothing
      if (input.website) return c.json({ reference: newReference("B") }, 201);

      const room = lodge.rooms.find((entry) => entry.id === input.roomId);
      if (!room) return c.json({ error: "That room isn't available. Pick another." }, 400);
      checkWindow(input, "guest");
      if (input.guests > room.sleeps * room.units) {
        return c.json({ error: `${room.name} sleeps ${room.sleeps}. Pick another room, or fewer guests.` }, 400);
      }
      const today = await prisma.booking.count({ where: { lodgeId: lodge.id, source: "SITE", createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } });
      if (today >= BOOKING_LIMITS.dailyRequests) {
        return c.json({ error: `${lodge.name} has a lot of requests today. Message them on WhatsApp instead.` }, 429);
      }
      const holds = await holdsFor(prisma, room.id, input.checkIn, input.checkOut);
      const fits = canHold(room.units, holds, { ...input, quantity: 1 });
      if (!fits.ok) return c.json({ error: `${room.name} is full on ${formatDay(fits.fullOn)}. Try other dates or another room.`, fullOn: fits.fullOn }, 409);

      // "Confirm bookings automatically": booked straight away, under the room's lock so the last room can't go twice
      const instant = lodge.autoConfirmBookings;
      let booking;
      try {
        booking = await prisma.$transaction(async (tx) => {
          if (instant) await claimRooms(tx, room, { ...input, quantity: 1 });
          return tx.booking.create({
            data: {
              reference: await bookingReference(tx),
              lodgeId: lodge.id,
              roomId: room.id,
              kind: "STAY",
              status: instant ? "CONFIRMED" : "REQUESTED",
              decidedAt: instant ? new Date() : null,
              source: "SITE",
              checkIn: dateValue(input.checkIn),
              checkOut: dateValue(input.checkOut),
              quantity: 1,
              guests: input.guests,
              guestName: input.name,
              guestPhone: input.phone,
              guestEmail: input.email,
              message: input.message,
              roomName: room.name,
              nightlyPrice: room.price,
            },
          });
        });
      } catch (error) {
        if (error instanceof HTTPException && error.status === 409) {
          return c.json({ error: `${error.message}. Try other dates or another room.` }, 409);
        }
        throw error;
      }

      const user = c.get("user");
      const own = Boolean(user && (user.id === lodge.ownerId || user.role === "ADMIN"));
      if (!own) {
        const { device, browser } = describeDevice(c.req.header("user-agent"));
        await prisma.siteEvent.create({
          data: {
            lodgeId: lodge.id,
            type: "BOOKING_REQUEST",
            visitorId: crypto.randomUUID(),
            path: "/#book",
            roomId: room.id,
            country: countryFrom(c.req.header("cf-ipcountry")),
            device,
            browser,
            ip: clientIp(c),
          },
        });
      }

      const nights = nightsBetween(input.checkIn, input.checkOut);
      await sendQuietly(
        bookingRequestEmail({
          to: lodge.owner.email,
          ownerName: lodge.owner.name,
          lodgeName: lodge.name,
          roomName: room.name,
          dates: formatStay(input.checkIn, input.checkOut),
          nights,
          guests: input.guests,
          total: `$${room.price * nights}`,
          reference: booking.reference,
          guestName: input.name,
          guestPhone: `+${input.phone}`,
          guestWhatsappUrl: `https://wa.me/${input.phone}`,
          message: input.message,
          requestsUrl: `${DASHBOARD_URL}/bookings?tab=${instant ? "upcoming" : "requests"}`,
          confirmed: instant,
        }),
        instant ? "new booking" : "booking request",
      );
      if (instant && input.email) {
        const times = [lodge.checkInFrom && `Check-in from ${lodge.checkInFrom}`, lodge.checkOutBy && `Check-out by ${lodge.checkOutBy}`].filter(Boolean).join(" · ");
        await sendQuietly(
          bookingConfirmedEmail({
            to: input.email,
            guestName: input.name,
            lodgeName: lodge.name,
            roomName: room.name,
            dates: formatStay(input.checkIn, input.checkOut),
            nights,
            guests: input.guests,
            total: `$${room.price * nights}`,
            reference: booking.reference,
            times: times || null,
            lodgeWhatsappUrl: lodge.whatsapp ? `https://wa.me/${lodge.whatsapp}` : null,
            replyTo: lodge.email ?? undefined,
          }),
          "booking confirmation",
        );
      }
      return c.json({ reference: booking.reference, status: booking.status }, 201);
    },
  )

  /**
   * A page view or a Book on WhatsApp tap. The owner's (and StayZim staff's)
   * own visits are skipped, so their numbers are guests only: by the session
   * cookie on stayzim.co.zw, by the owner key on the lodge's own domain.
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
        select: { id: true, ownerId: true, status: true, demoEndsAt: true },
      });
      if (!lodge || lodge.status === "SUSPENDED" || demoEnded(lodge, new Date())) return c.body(null, 204);

      const user = c.get("user");
      if (user && (user.id === lodge.ownerId || user.role === "ADMIN")) return c.body(null, 204);
      if (isOwnerVisitKey(lodge.id, event.ownerKey)) return c.body(null, 204);

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
