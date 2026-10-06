import prisma from "@stayzim/db";
import { bookingClosedEmail, bookingConfirmedEmail } from "@stayzim/mail/templates";
import {
  dateValue,
  formatStay,
  isDateString,
  nightsBetween,
  overbookedNights,
  todayInHarare,
  type BookingsWindow,
  type Hold,
} from "@stayzim/sites";
import { blockInput, bookingAction, ownerBookingInput } from "@stayzim/sites/schemas";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { sendQuietly } from "../lib/billing";
import { bookingJson, bookingReference, bookingsEnabled, checkWindow, claimRooms, HOLDING } from "../lib/bookings";
import { lodgeJson, type LodgeVariables } from "../lib/lodge";
import { siteUrlFor } from "../lib/sites";
import { validJson } from "../lib/validate";

const MAX_WINDOW_DAYS = 92;
const PAGE_SIZE = 20;

async function lodgeFor(lodgeId: string) {
  return prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    select: { id: true, plan: true, name: true, slug: true, customDomain: true, whatsapp: true, email: true, checkInFrom: true, checkOutBy: true },
  });
}

/** Writes need the plan; after a downgrade everything stays readable. */
async function requireBookings(lodgeId: string) {
  const lodge = await lodgeFor(lodgeId);
  if (!bookingsEnabled(lodge.plan)) throw new HTTPException(403, { message: "Bookings come with the Growth and Pro plans" });
  return lodge;
}

async function findRoom(lodgeId: string, roomId: string) {
  const room = await prisma.room.findFirst({ where: { id: roomId, lodgeId }, select: { id: true, name: true, units: true, price: true } });
  if (!room) throw new HTTPException(404, { message: "That room no longer exists" });
  return room;
}

async function findBooking(lodgeId: string, id: string) {
  const booking = await prisma.booking.findFirst({ where: { id, lodgeId } });
  if (!booking) throw new HTTPException(404, { message: "That booking no longer exists" });
  return booking;
}

/** The guest hears from the lodge by email when they gave one; WhatsApp is the owner's tap in the dashboard. */
async function emailGuest(booking: Awaited<ReturnType<typeof findBooking>>, lodge: Awaited<ReturnType<typeof lodgeFor>>, kind: "confirmed" | "declined" | "cancelled") {
  if (!booking.guestEmail || booking.kind !== "STAY") return;
  const json = bookingJson(booking);
  const stay = {
    to: booking.guestEmail,
    guestName: booking.guestName ?? "there",
    lodgeName: lodge.name,
    roomName: booking.roomName,
    dates: formatStay(json.checkIn, json.checkOut),
    nights: json.nights,
    guests: booking.guests,
    total: `$${json.total}`,
    reference: booking.reference,
    replyTo: lodge.email ?? undefined,
  };
  if (kind === "confirmed") {
    const times = [lodge.checkInFrom && `Check-in from ${lodge.checkInFrom}`, lodge.checkOutBy && `Check-out by ${lodge.checkOutBy}`].filter(Boolean).join(" · ");
    await sendQuietly(
      bookingConfirmedEmail({ ...stay, times: times || null, lodgeWhatsappUrl: lodge.whatsapp ? `https://wa.me/${lodge.whatsapp}` : null }),
      "booking confirmation",
    );
  } else {
    await sendQuietly(bookingClosedEmail({ ...stay, kind, reason: booking.cancelReason, siteUrl: siteUrlFor(lodge) }), `booking ${kind}`);
  }
}

const windowQuery = z.object({
  from: z.string().refine(isDateString),
  to: z.string().refine(isDateString),
});

const listQuery = z.object({
  when: z.enum(["requests", "upcoming", "past"]),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** /api/lodge/bookings: the owner's calendar. Mounted under the lodge router, which checks the session and finds the lodge. */
export const bookings = new Hono<{ Variables: LodgeVariables }>()
  /** Everything overlapping a window of dates (any status), with what the calendar needs to draw it. */
  .get("/", async (c) => {
    const parsed = windowQuery.safeParse(c.req.query());
    if (!parsed.success || parsed.data.to <= parsed.data.from || nightsBetween(parsed.data.from, parsed.data.to) > MAX_WINDOW_DAYS) {
      throw new HTTPException(400, { message: `Pick up to ${MAX_WINDOW_DAYS} days` });
    }
    const { from, to } = parsed.data;
    const lodgeId = c.var.lodgeId;
    const today = todayInHarare();
    const [lodge, rooms, rows, waiting] = await Promise.all([
      lodgeFor(lodgeId),
      prisma.room.findMany({ where: { lodgeId }, orderBy: { position: "asc" }, select: { id: true, name: true, units: true, visible: true, price: true } }),
      prisma.booking.findMany({
        where: { lodgeId, checkIn: { lt: dateValue(to) }, checkOut: { gt: dateValue(from) } },
        orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
      }),
      prisma.booking.count({ where: { lodgeId, status: "REQUESTED", checkIn: { gte: dateValue(today) } } }),
    ]);
    const list = rows.map((row) => bookingJson(row, today));
    const overbooked = rooms.flatMap((room) => {
      const holds: Hold[] = list.filter((booking) => booking.roomId === room.id && booking.status === "CONFIRMED");
      return overbookedNights(room.units, holds, from, to).map(({ night, taken }) => ({ roomId: room.id, night, taken, units: room.units }));
    });
    return c.json({ from, to, rooms, bookings: list, overbooked, waiting, enabled: bookingsEnabled(lodge.plan) } satisfies BookingsWindow);
  })

  /** Requests waiting (oldest first), upcoming stays (soonest first), or the past (newest first), with search. */
  .get("/list", async (c) => {
    const parsed = listQuery.safeParse(c.req.query());
    if (!parsed.success) throw new HTTPException(400, { message: "Unknown list" });
    const { when, q, page } = parsed.data;
    const lodgeId = c.var.lodgeId;
    const today = dateValue(todayInHarare());
    const search = q
      ? {
          OR: [
            { guestName: { contains: q, mode: "insensitive" as const } },
            { reference: { contains: q.toUpperCase() } },
            { guestPhone: { contains: q.replace(/\D/g, "") || "~" } },
          ],
        }
      : {};
    const where =
      when === "requests"
        ? { lodgeId, kind: "STAY" as const, status: "REQUESTED" as const, checkIn: { gte: today } }
        : when === "upcoming"
          ? { lodgeId, kind: "STAY" as const, ...HOLDING, checkOut: { gte: today } }
          : {
              lodgeId,
              kind: "STAY" as const,
              OR: [
                { status: { in: ["DECLINED" as const, "CANCELLED" as const] } },
                { status: "CONFIRMED" as const, checkOut: { lt: today } },
                { status: "REQUESTED" as const, checkIn: { lt: today } },
              ],
            };
    const orderBy = when === "requests" ? { createdAt: "asc" as const } : when === "upcoming" ? { checkIn: "asc" as const } : { checkIn: "desc" as const };
    const filter = q ? { AND: [where, search] } : where;
    const [rows, total] = await Promise.all([
      prisma.booking.findMany({ where: filter, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.booking.count({ where: filter }),
    ]);
    return c.json({ bookings: rows.map((row) => bookingJson(row)), total, page, pageSize: PAGE_SIZE });
  })

  /** A booking the owner took on WhatsApp or by phone: confirmed straight away. */
  .post("/", validJson(ownerBookingInput), async (c) => {
    const lodgeId = c.var.lodgeId;
    await requireBookings(lodgeId);
    const input = c.req.valid("json");
    checkWindow(input, "owner");
    const room = await findRoom(lodgeId, input.roomId);
    const booking = await prisma.$transaction(async (tx) => {
      await claimRooms(tx, room, input);
      return tx.booking.create({
        data: {
          reference: await bookingReference(tx),
          lodgeId,
          roomId: room.id,
          kind: "STAY",
          status: "CONFIRMED",
          source: "OWNER",
          checkIn: dateValue(input.checkIn),
          checkOut: dateValue(input.checkOut),
          quantity: input.quantity,
          guests: input.guests,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
          notes: input.notes,
          roomName: room.name,
          nightlyPrice: room.price,
          decidedAt: new Date(),
        },
      });
    });
    return c.json({ booking: bookingJson(booking), lodge: await lodgeJson(lodgeId) }, 201);
  })

  /** Closed dates: by default every one of the room. */
  .post("/blocks", validJson(blockInput), async (c) => {
    const lodgeId = c.var.lodgeId;
    await requireBookings(lodgeId);
    const input = c.req.valid("json");
    checkWindow(input, "owner");
    const room = await findRoom(lodgeId, input.roomId);
    const quantity = input.quantity ?? room.units;
    const block = await prisma.$transaction(async (tx) => {
      await claimRooms(tx, room, { ...input, quantity });
      return tx.booking.create({
        data: {
          reference: await bookingReference(tx),
          lodgeId,
          roomId: room.id,
          kind: "BLOCK",
          status: "CONFIRMED",
          source: "OWNER",
          checkIn: dateValue(input.checkIn),
          checkOut: dateValue(input.checkOut),
          quantity,
          notes: input.notes,
          roomName: room.name,
          nightlyPrice: 0,
          decidedAt: new Date(),
        },
      });
    });
    return c.json({ booking: bookingJson(block), lodge: await lodgeJson(lodgeId) }, 201);
  })

  /** Confirm or decline a request, cancel a booking (or open closed dates), or change one. */
  .patch("/:id", validJson(bookingAction), async (c) => {
    const lodgeId = c.var.lodgeId;
    const lodge = await requireBookings(lodgeId);
    const booking = await findBooking(lodgeId, c.req.param("id"));
    const input = c.req.valid("json");
    const today = todayInHarare();
    const current = bookingJson(booking, today);

    if (input.action === "confirm") {
      if (booking.status !== "REQUESTED") throw new HTTPException(409, { message: `This booking was already ${booking.status.toLowerCase()}` });
      if (current.expired) throw new HTTPException(409, { message: "This request's dates have passed" });
      const room = await findRoom(lodgeId, booking.roomId);
      const updated = await prisma.$transaction(async (tx) => {
        await claimRooms(tx, room, current);
        return tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", decidedAt: new Date() } });
      });
      await emailGuest(updated, lodge, "confirmed");
      return c.json({ booking: bookingJson(updated), lodge: await lodgeJson(lodgeId) });
    }

    if (input.action === "decline") {
      if (booking.status !== "REQUESTED") throw new HTTPException(409, { message: `This booking was already ${booking.status.toLowerCase()}` });
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "DECLINED", decidedAt: new Date(), cancelReason: input.reason ?? null },
      });
      await emailGuest(updated, lodge, "declined");
      return c.json({ booking: bookingJson(updated), lodge: await lodgeJson(lodgeId) });
    }

    if (input.action === "cancel") {
      if (booking.status !== "CONFIRMED") throw new HTTPException(409, { message: `This booking was already ${booking.status.toLowerCase()}` });
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: input.reason ?? null },
      });
      await emailGuest(updated, lodge, "cancelled");
      return c.json({ booking: bookingJson(updated), lodge: await lodgeJson(lodgeId) });
    }

    // Edit: requests and confirmed bookings only
    if (booking.status !== "REQUESTED" && booking.status !== "CONFIRMED") {
      throw new HTTPException(409, { message: `This booking was ${booking.status.toLowerCase()}, so it can't change` });
    }
    const { action: _action, ...changes } = input;
    const next = {
      roomId: changes.roomId ?? booking.roomId,
      checkIn: changes.checkIn ?? current.checkIn,
      checkOut: changes.checkOut ?? current.checkOut,
      quantity: changes.quantity ?? booking.quantity,
    };
    if (next.checkOut <= next.checkIn) throw new HTTPException(400, { message: "Check-out is after check-in" });
    const moved =
      next.roomId !== booking.roomId || next.checkIn !== current.checkIn || next.checkOut !== current.checkOut || next.quantity !== booking.quantity;
    if (moved) checkWindow(next, "owner", today);
    const room = await findRoom(lodgeId, next.roomId);
    const updated = await prisma.$transaction(async (tx) => {
      if (moved && booking.status === "CONFIRMED") await claimRooms(tx, room, next, booking.id);
      return tx.booking.update({
        where: { id: booking.id },
        data: {
          roomId: room.id,
          checkIn: dateValue(next.checkIn),
          checkOut: dateValue(next.checkOut),
          quantity: next.quantity,
          ...(next.roomId !== booking.roomId ? { roomName: room.name } : {}),
          ...(changes.guests !== undefined ? { guests: changes.guests } : {}),
          ...(changes.guestName !== undefined ? { guestName: changes.guestName } : {}),
          ...(changes.guestPhone !== undefined ? { guestPhone: changes.guestPhone } : {}),
          ...(changes.guestEmail !== undefined ? { guestEmail: changes.guestEmail } : {}),
          ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
        },
      });
    });
    return c.json({ booking: bookingJson(updated), lodge: await lodgeJson(lodgeId) });
  });
