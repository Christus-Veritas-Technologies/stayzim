import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { clientIp } from "../lib/ip";

/** Short slugs like "hero_whatsapp" or "pricing"; keeps junk out of the table. */
const slug = z
  .string()
  .trim()
  .max(64)
  .regex(/^[a-z0-9_-]+$/);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const landingEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PAGE_VIEW"),
    visitorId: z.string().uuid(),
    path: z.string().max(512),
    referrer: optionalText(1024),
    utmSource: optionalText(128),
    utmMedium: optionalText(128),
    utmCampaign: optionalText(128),
  }),
  z.object({
    type: z.literal("CTA_CLICK"),
    visitorId: z.string().uuid(),
    path: z.string().max(512),
    cta: slug,
    section: slug,
    plan: z.enum(["starter", "growth", "pro"]).optional(),
    utmSource: optionalText(128),
    utmMedium: optionalText(128),
    utmCampaign: optionalText(128),
  }),
]);

export const landing = new Hono()
  .use(
    "/events",
    // Public and unauthenticated, so cap how much one visitor can write
    rateLimiter({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: "draft-7",
      keyGenerator: clientIp,
    }),
    bodyLimit({ maxSize: 4 * 1024 }),
  )
  .post("/events", zValidator("json", landingEventSchema), async (c) => {
    const event = c.req.valid("json");

    await prisma.landingEvent.create({
      data: {
        ...event,
        userAgent: c.req.header("user-agent")?.slice(0, 512),
      },
    });

    return c.body(null, 204);
  });
