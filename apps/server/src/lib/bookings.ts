import prisma from "@stayzim/db";
import {
  canHold,
  dateAdd,
  dateOnly,
  dateValue,
  formatDay,
  includesBookingCalendar,
  nightsBetween,
  todayInHarare,
  type DashboardBooking,
  type Hold,
  type Plan,
} from "@stayzim/sites";
import { HTTPException } from "hono/http-exception";

import { newReference } from "./reference";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type StoredBooking = {
  id: string;
  reference: string;
  kind: "STAY" | "BLOCK";
  status: "REQUESTED" | "CONFIRMED" | "DECLINED" | "CANCELLED";
  source: "SITE" | "OWNER";
  roomId: string;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  quantity: number;
  guests: number | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  message: string | null;
  notes: string | null;
  nightlyPrice: number;
  createdAt: Date;
  decidedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
};

export function bookingJson(booking: StoredBooking, today = todayInHarare()): DashboardBooking {
  const checkIn = dateOnly(booking.checkIn);
  const checkOut = dateOnly(booking.checkOut);
  const nights = nightsBetween(checkIn, checkOut);
  return {
    id: booking.id,
    reference: booking.reference,
    kind: booking.kind,
    status: booking.status,
    source: booking.source,
    roomId: booking.roomId,
    roomName: booking.roomName,
    checkIn,
    checkOut,
    nights,
    quantity: booking.quantity,
    guests: booking.guests,
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    guestEmail: booking.guestEmail,
    message: booking.message,
    notes: booking.notes,
    nightlyPrice: booking.nightlyPrice,
    total: booking.kind === "STAY" ? booking.nightlyPrice * nights * booking.quantity : 0,
    expired: booking.status === "REQUESTED" && checkIn < today,
    createdAt: booking.createdAt.toISOString(),
    decidedAt: booking.decidedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    cancelReason: booking.cancelReason,
  };
}

/** Bookings that take rooms: confirmed stays and closed dates. Requests don't. */
export const HOLDING = { status: "CONFIRMED" } as const;

/** What takes rooms of one type between two dates, leaving out one booking (the one being edited). */
export async function holdsFor(db: Tx | typeof prisma, roomId: string, from: string, to: string, except?: string): Promise<Hold[]> {
  const rows = await db.booking.findMany({
    where: { roomId, ...HOLDING, checkIn: { lt: dateValue(to) }, checkOut: { gt: dateValue(from) }, ...(except ? { id: { not: except } } : {}) },
    select: { checkIn: true, checkOut: true, quantity: true },
  });
  return rows.map((row) => ({ checkIn: dateOnly(row.checkIn), checkOut: dateOnly(row.checkOut), quantity: row.quantity }));
}

/**
 * Makes sure `quantity` more of the room fit for the whole stay, inside a
 * transaction that holds the room's lock: two owners (or tabs) confirming the
 * last room at the same moment queue here, and the second one is told it's full.
 */
export async function claimRooms(
  tx: Tx,
  room: { id: string; name: string; units: number },
  stay: { checkIn: string; checkOut: string; quantity: number },
  except?: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${room.id}))::text`;
  if (stay.quantity > room.units) {
    throw new HTTPException(422, { message: `You have ${room.units} ${room.name}${room.units === 1 ? "" : "s"}` });
  }
  const result = canHold(room.units, await holdsFor(tx, room.id, stay.checkIn, stay.checkOut, except), stay);
  if (!result.ok) throw new HTTPException(409, { message: `${room.name} is full on ${formatDay(result.fullOn)}` });
}

/** A reference no other booking has. */
export async function bookingReference(db: Tx | typeof prisma) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const reference = newReference("B");
    if (!(await db.booking.findUnique({ where: { reference }, select: { id: true } }))) return reference;
  }
  return newReference("B", 6);
}

/** How far back owners can add bookings, and how far ahead anyone can. */
export function checkWindow(stay: { checkIn: string; checkOut: string }, who: "owner" | "guest", today = todayInHarare()) {
  const latest = dateAdd(today, 18 * 31);
  if (stay.checkOut > latest) throw new HTTPException(400, { message: "That's too far ahead. Pick dates in the next 18 months." });
  if (who === "guest" && stay.checkIn < today) throw new HTTPException(400, { message: "Pick dates from today on" });
  if (who === "owner" && stay.checkIn < dateAdd(today, -366)) throw new HTTPException(400, { message: "That's more than a year ago" });
}

/** Bookings come with Growth and Pro; after a downgrade they stay, read-only. */
export function bookingsEnabled(plan: Plan) {
  return includesBookingCalendar(plan);
}

/** Today's arrivals, departures and stays, and the requests waiting, for the dashboard. */
export async function bookingsToday(lodgeId: string, plan: Plan) {
  if (!bookingsEnabled(plan)) return { waiting: 0, today: { arriving: 0, leaving: 0, staying: 0 }, upcoming: new Map<string, number>() };
  const today = todayInHarare();
  const [waiting, around, upcoming] = await Promise.all([
    prisma.booking.count({ where: { lodgeId, status: "REQUESTED", checkIn: { gte: dateValue(today) } } }),
    prisma.booking.findMany({
      where: { lodgeId, kind: "STAY", ...HOLDING, checkIn: { lte: dateValue(today) }, checkOut: { gte: dateValue(today) } },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.booking.groupBy({
      by: ["roomId"],
      where: { lodgeId, kind: "STAY", ...HOLDING, checkOut: { gt: dateValue(today) } },
      _count: { _all: true },
    }),
  ]);
  const days = around.map((stay) => ({ checkIn: dateOnly(stay.checkIn), checkOut: dateOnly(stay.checkOut) }));
  return {
    waiting,
    today: {
      arriving: days.filter((stay) => stay.checkIn === today).length,
      leaving: days.filter((stay) => stay.checkOut === today).length,
      staying: days.filter((stay) => stay.checkIn < today && stay.checkOut > today).length,
    },
    upcoming: new Map(upcoming.map((row) => [row.roomId, row._count._all])),
  };
}
