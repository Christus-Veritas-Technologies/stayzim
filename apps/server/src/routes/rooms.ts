import prisma from "@stayzim/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { lodgeJson, type LodgeVariables } from "../lib/lodge";
import { removeUploads } from "../lib/uploads";
import { validJson } from "../lib/validate";

/** Matches the amenity list in apps/web/src/lib/lodge.ts. */
export const AMENITIES = ["wifi", "braai", "fireplace", "parking", "kitchen", "breakfast", "bath", "aircon", "pool", "tv"] as const;

const MAX_ROOMS = 30;

const roomSchema = z.object({
  name: z.string().trim().min(1, "Add the room name").max(60, "Keep the room name under 60 characters"),
  price: z
    .number({ error: "Add the price per night" })
    .int("Use whole dollars")
    .min(1, "Add the price per night")
    .max(10_000, "Check the price per night"),
  sleeps: z.number().int().min(1, "A room sleeps at least 1").max(30, "Check how many it sleeps"),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).default([]),
});

async function findRoom(lodgeId: string, roomId: string) {
  const room = await prisma.room.findFirst({ where: { id: roomId, lodgeId }, select: { id: true } });
  if (!room) throw new HTTPException(404, { message: "That room no longer exists" });
  return room;
}

/** /api/lodge/rooms. Mounted under the lodge router, which checks the session and finds the lodge. */
export const rooms = new Hono<{ Variables: LodgeVariables }>()
  /** New rooms go last. */
  .post("/", validJson(roomSchema), async (c) => {
    const lodgeId = c.var.lodgeId;
    const count = await prisma.room.count({ where: { lodgeId } });
    if (count >= MAX_ROOMS) throw new HTTPException(400, { message: `You can have up to ${MAX_ROOMS} rooms` });
    const room = await prisma.room.create({ data: { ...c.req.valid("json"), lodgeId, position: count } });
    return c.json({ roomId: room.id, lodge: await lodgeJson(lodgeId) }, 201);
  })

  .patch("/:id", validJson(roomSchema.partial()), async (c) => {
    const lodgeId = c.var.lodgeId;
    const room = await findRoom(lodgeId, c.req.param("id"));
    await prisma.room.update({ where: { id: room.id }, data: c.req.valid("json") });
    return c.json(await lodgeJson(lodgeId));
  })

  /** Deletes the room and its photos, then closes the gap in the order. */
  .delete("/:id", async (c) => {
    const lodgeId = c.var.lodgeId;
    const room = await findRoom(lodgeId, c.req.param("id"));
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
