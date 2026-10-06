import prisma from "@stayzim/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { dateValue, MAX_ROOMS, ROOM_LIMITS, todayInHarare } from "@stayzim/sites";
import { roomInput, roomPatch } from "@stayzim/sites/schemas";
import { z } from "zod";

import { lodgeJson, type LodgeVariables } from "../lib/lodge";
import { removeUploads } from "../lib/uploads";
import { validJson } from "../lib/validate";

async function findRoom(lodgeId: string, roomId: string) {
  const room = await prisma.room.findFirst({ where: { id: roomId, lodgeId }, select: { id: true, name: true } });
  if (!room) throw new HTTPException(404, { message: "That room no longer exists" });
  return room;
}

/** /api/lodge/rooms. Mounted under the lodge router, which checks the session and finds the lodge. */
export const rooms = new Hono<{ Variables: LodgeVariables }>()
  /** New rooms go last. */
  .post("/", validJson(roomInput), async (c) => {
    const lodgeId = c.var.lodgeId;
    const count = await prisma.room.count({ where: { lodgeId } });
    if (count >= MAX_ROOMS) throw new HTTPException(400, { message: `You can have up to ${MAX_ROOMS} rooms` });
    const room = await prisma.room.create({ data: { ...c.req.valid("json"), lodgeId, position: count } });
    return c.json({ roomId: room.id, lodge: await lodgeJson(lodgeId) }, 201);
  })

  .patch("/:id", validJson(roomPatch), async (c) => {
    const lodgeId = c.var.lodgeId;
    const room = await findRoom(lodgeId, c.req.param("id"));
    await prisma.room.update({ where: { id: room.id }, data: c.req.valid("json") });
    return c.json(await lodgeJson(lodgeId));
  })

  /**
   * A copy of the room, without its photos, straight after it. It starts hidden
   * so a half-edited copy never shows on the site.
   */
  .post("/:id/duplicate", async (c) => {
    const lodgeId = c.var.lodgeId;
    const { id } = await findRoom(lodgeId, c.req.param("id"));
    const count = await prisma.room.count({ where: { lodgeId } });
    if (count >= MAX_ROOMS) throw new HTTPException(400, { message: `You can have up to ${MAX_ROOMS} rooms` });
    const source = await prisma.room.findUniqueOrThrow({ where: { id } });
    const copy = await prisma.$transaction(async (tx) => {
      await tx.room.updateMany({ where: { lodgeId, position: { gt: source.position } }, data: { position: { increment: 1 } } });
      return tx.room.create({
        data: {
          lodgeId,
          name: `${source.name.slice(0, ROOM_LIMITS.name - " (copy)".length)} (copy)`,
          price: source.price,
          sleeps: source.sleeps,
          amenities: source.amenities,
          description: source.description,
          beds: source.beds,
          size: source.size,
          units: source.units,
          visible: false,
          position: source.position + 1,
        },
      });
    });
    return c.json({ roomId: copy.id, lodge: await lodgeJson(lodgeId) }, 201);
  })

  /** Deletes the room and its photos, then closes the gap in the order. */
  .delete("/:id", async (c) => {
    const lodgeId = c.var.lodgeId;
    const room = await findRoom(lodgeId, c.req.param("id"));
    // Bookings keep their room (and its name and price at the time): hide it instead
    const today = dateValue(todayInHarare());
    const [upcoming, any] = await Promise.all([
      prisma.booking.count({ where: { roomId: room.id, status: "CONFIRMED", kind: "STAY", checkOut: { gt: today } } }),
      prisma.booking.count({ where: { roomId: room.id } }),
    ]);
    if (upcoming > 0) {
      throw new HTTPException(409, {
        message: `${room.name} has ${upcoming} upcoming ${upcoming === 1 ? "booking" : "bookings"}. Hide it instead, or cancel ${upcoming === 1 ? "it" : "them"} first.`,
      });
    }
    if (any > 0) throw new HTTPException(409, { message: `${room.name} has past bookings, so it can't be deleted. Hide it instead.` });
    const photos = await prisma.photo.findMany({ where: { roomId: room.id }, select: { key: true, mediumKey: true, smallKey: true } });
    await prisma.$transaction(async (tx) => {
      await tx.room.delete({ where: { id: room.id } });
      const remaining = await tx.room.findMany({ where: { lodgeId }, orderBy: { position: "asc" }, select: { id: true } });
      await Promise.all(remaining.map(({ id }, position) => tx.room.update({ where: { id }, data: { position } })));
    });
    await removeUploads(photos.flatMap((photo) => [photo.key, photo.mediumKey, photo.smallKey].filter((key): key is string => Boolean(key))));
    return c.json(await lodgeJson(lodgeId));
  })

  /** The new order, as every room id from first to last. */
  .put("/order", validJson(z.object({ ids: z.array(z.string()).max(MAX_ROOMS) })), async (c) => {
    const lodgeId = c.var.lodgeId;
    const { ids } = c.req.valid("json");
    const existing = await prisma.room.findMany({ where: { lodgeId }, select: { id: true } });
    const known = new Set(existing.map((room) => room.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
      throw new HTTPException(409, { message: "Your rooms changed in another tab. Reload and try again." });
    }
    await prisma.$transaction(ids.map((id, position) => prisma.room.update({ where: { id }, data: { position } })));
    return c.json(await lodgeJson(lodgeId));
  });
