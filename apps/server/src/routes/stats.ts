import prisma from "@stayzim/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";
import { z } from "zod";

import type { LodgeVariables } from "../lib/lodge";

/** Days and hours on owners' charts are Zimbabwe time (CAT, UTC+2, no daylight saving). */
const OFFSET_MS = 2 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function startOfLocalDay(date: Date) {
  const local = date.getTime() + OFFSET_MS;
  return new Date(local - (local % DAY) - OFFSET_MS);
}

const PERIODS = {
  today: { buckets: 8, size: 3 * HOUR },
  "7d": { buckets: 7, size: DAY },
  "30d": { buckets: 30, size: DAY },
  "90d": { buckets: 90, size: DAY },
} as const;

type Period = keyof typeof PERIODS;

/** Visitor analytics come with Growth and Pro (and the Growth trial). */
const requireAnalytics = createMiddleware<{ Variables: LodgeVariables }>(async (c, next) => {
  const lodge = await prisma.lodge.findUniqueOrThrow({ where: { id: c.var.lodgeId }, select: { plan: true } });
  if (lodge.plan === "STARTER") throw new HTTPException(403, { message: "Visitor analytics come with the Growth plan" });
  await next();
});

const visitsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
  /** zw: visitors in Zimbabwe; abroad: anywhere else we know */
  where: z.enum(["all", "zw", "abroad"]).default("all"),
  device: z.enum(["PHONE", "TABLET", "COMPUTER"]).optional(),
  type: z.enum(["PAGE_VIEW", "BOOKING_CHAT"]).optional(),
});

/** /api/lodge/stats, /visits, /activity. Mounted under the lodge router. */
export const stats = new Hono<{ Variables: LodgeVariables }>()
  .use(requireAnalytics)

  /** Totals, the period before, countries and the chart, for the overview and Analytics. */
  .get("/stats", async (c) => {
    const period = (c.req.query("period") ?? "7d") as Period;
    const shape = PERIODS[period];
    if (!shape) throw new HTTPException(400, { message: "Unknown period" });

    const now = new Date();
    const today = startOfLocalDay(now);
    const start = period === "today" ? today : new Date(today.getTime() - (shape.buckets - 1) * DAY);
    const span = period === "today" ? DAY : shape.buckets * DAY;
    const previousStart = new Date(start.getTime() - span);
    const yesterday = new Date(today.getTime() - DAY);
    const from = previousStart < yesterday ? previousStart : yesterday;

    const events = await prisma.siteEvent.findMany({
      where: { lodgeId: c.var.lodgeId, createdAt: { gte: from } },
      select: { type: true, createdAt: true, country: true },
    });

    const current = Array.from({ length: shape.buckets }, () => 0);
    const previous = Array.from({ length: shape.buckets }, () => 0);
    let visits = 0;
    let previousVisits = 0;
    let bookingChats = 0;
    let previousBookingChats = 0;
    let visitsToday = 0;
    let visitsYesterday = 0;
    const countries = new Map<string, number>();

    for (const event of events) {
      const time = event.createdAt.getTime();
      const view = event.type === "PAGE_VIEW";
      if (view && time >= today.getTime()) visitsToday++;
      else if (view && time >= yesterday.getTime() && time < today.getTime()) visitsYesterday++;

      if (time >= start.getTime()) {
        if (view) {
          visits++;
          current[Math.min(shape.buckets - 1, Math.floor((time - start.getTime()) / shape.size))]!++;
          if (event.country) countries.set(event.country, (countries.get(event.country) ?? 0) + 1);
        } else bookingChats++;
      } else if (time >= previousStart.getTime()) {
        if (view) {
          previousVisits++;
          previous[Math.min(shape.buckets - 1, Math.floor((time - previousStart.getTime()) / shape.size))]!++;
        } else previousBookingChats++;
      }
    }

    const known = [...countries.values()].reduce((sum, count) => sum + count, 0);
    const ranked = [...countries.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, 2).map(([code, count]) => ({ code, share: Math.round((count / known) * 100) }));
    const other = ranked.length > 2 ? 100 - top.reduce((sum, country) => sum + country.share, 0) : 0;

    return c.json({
      tracking: true,
      period,
      visitsToday,
      visitsYesterday,
      visits,
      previousVisits,
      bookingChats,
      previousBookingChats,
      countries: other > 0 ? [...top, { code: "Other", share: other }] : top,
      chart: current.map((count, index) => ({
        start: new Date(start.getTime() + index * shape.size).toISOString(),
        current: count,
        previous: previous[index] ?? 0,
      })),
    });
  })

  /** Recent visits, newest first, with filters. */
  .get("/visits", async (c) => {
    const query = visitsQuery.safeParse(c.req.query());
    if (!query.success) throw new HTTPException(400, { message: "Check the filters" });
    const { page, pageSize, where: region, device, type } = query.data;
    const where = {
      lodgeId: c.var.lodgeId,
      ...(device ? { device } : {}),
      ...(type ? { type } : {}),
      ...(region === "zw" ? { country: "ZW" } : region === "abroad" ? { country: { not: "ZW" }, NOT: { country: null } } : {}),
    };
    const [total, items, rooms] = await Promise.all([
      prisma.siteEvent.count({ where }),
      prisma.siteEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.room.findMany({ where: { lodgeId: c.var.lodgeId }, select: { id: true, name: true } }),
    ]);
    const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
    return c.json({
      total,
      page,
      pageSize,
      items: items.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt,
        country: event.country,
        device: event.device,
        browser: event.browser,
        path: event.path,
        ip: event.ip,
        room: event.roomId ? (roomNames.get(event.roomId) ?? null) : null,
      })),
    });
  })

  /** The latest visits and booking chats, for the overview's activity card. */
  .get("/activity", async (c) => {
    const [events, rooms] = await Promise.all([
      prisma.siteEvent.findMany({ where: { lodgeId: c.var.lodgeId }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.room.findMany({ where: { lodgeId: c.var.lodgeId }, select: { id: true, name: true } }),
    ]);
    const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
    return c.json(
      events.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt,
        country: event.country,
        device: event.device,
        path: event.path,
        room: event.roomId ? (roomNames.get(event.roomId) ?? null) : null,
      })),
    );
  });
