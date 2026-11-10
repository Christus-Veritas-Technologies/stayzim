import prisma from "@stayzim/db";
import { dateValue, findTemplate, MAX_ROOMS, PLANS_LABEL, templateAllowed, todayInHarare } from "@stayzim/sites";
import { lodgePatch, roomInput } from "@stayzim/sites/schemas";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { removeUploads } from "./uploads";

/**
 * Edits to a lodge's content, the same whether the owner makes them on the
 * dashboard (PATCH /api/lodge) or the team makes them for the owner (the admin
 * app and the sales agent, PATCH /api/admin/sites/:slug/content).
 */

/** Saves a lodge edit: the hero photo must be from its gallery, the design one its plan allows. */
export async function editLodge(lodgeId: string, data: z.infer<typeof lodgePatch>) {
  if (data.heroPhotoId) {
    const photo = await prisma.photo.findFirst({ where: { id: data.heroPhotoId, lodgeId, roomId: null }, select: { id: true } });
    if (!photo) throw new HTTPException(400, { message: "Pick a photo from your gallery" });
  }
  if (data.template) {
    const template = findTemplate(data.template);
    if (!template) throw new HTTPException(400, { message: "Pick one of the designs" });
    const { plan } = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { plan: true } });
    if (!templateAllowed(template, plan)) throw new HTTPException(403, { message: `${template.name} comes with the ${PLANS_LABEL[template.plan]} plan` });
  }
  await prisma.lodge.update({ where: { id: lodgeId }, data });
}

/** PUT /api/admin/sites/:slug/rooms: every room, in order. A room with an id keeps its photos and bookings. */
export const roomsInput = z.object({
  rooms: z
    .array(roomInput.extend({ id: z.string().max(64).optional() }))
    .max(MAX_ROOMS, `Up to ${MAX_ROOMS} rooms`),
});

/**
 * Makes a lodge's rooms exactly `rooms`, in that order: rooms with an id are
 * updated (keeping their photos), the rest are added, and rooms left out are
 * deleted with their photos. A room left out that has bookings is hidden
 * instead (bookings keep their room); one with upcoming stays stops the change.
 */
export async function setRooms(lodgeId: string, rooms: z.infer<typeof roomsInput>["rooms"]) {
  const existing = await prisma.room.findMany({ where: { lodgeId }, select: { id: true, name: true } });
  const known = new Map(existing.map((room) => [room.id, room]));
  const ids = rooms.flatMap((room) => (room.id ? [room.id] : []));
  const unknown = ids.find((id) => !known.has(id));
  if (unknown) throw new HTTPException(400, { message: `No room ${unknown} on this site` });
  if (new Set(ids).size !== ids.length) throw new HTTPException(400, { message: "A room is listed twice" });

  const leaving = existing.filter((room) => !ids.includes(room.id));
  const today = dateValue(todayInHarare());
  const booked = new Set<string>();
  for (const room of leaving) {
    const [upcoming, any] = await Promise.all([
      prisma.booking.count({ where: { roomId: room.id, status: "CONFIRMED", kind: "STAY", checkOut: { gt: today } } }),
      prisma.booking.count({ where: { roomId: room.id } }),
    ]);
    if (upcoming > 0) throw new HTTPException(409, { message: `${room.name} has ${upcoming} upcoming ${upcoming === 1 ? "booking" : "bookings"}: keep it, or hide it (visible: false)` });
    if (any > 0) booked.add(room.id);
  }
  const deleted = leaving.filter((room) => !booked.has(room.id)).map((room) => room.id);
  const photos = await prisma.photo.findMany({ where: { roomId: { in: deleted } }, select: { key: true, mediumKey: true, smallKey: true } });

  await prisma.$transaction(async (tx) => {
    await tx.room.deleteMany({ where: { id: { in: deleted }, lodgeId } });
    // Kept for their bookings, hidden, after the listed rooms
    for (const [index, id] of [...booked].entries()) await tx.room.update({ where: { id }, data: { visible: false, position: rooms.length + index } });
    for (const [position, { id, ...room }] of rooms.entries()) {
      if (id) await tx.room.update({ where: { id }, data: { ...room, position } });
      else await tx.room.create({ data: { ...room, lodgeId, position } });
    }
  });
  await removeUploads(photos.flatMap((photo) => [photo.key, photo.mediumKey, photo.smallKey].filter((key): key is string => Boolean(key))));
}
