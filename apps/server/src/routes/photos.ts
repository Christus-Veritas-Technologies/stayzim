import prisma from "@stayzim/db";
import { CAPTION_LIMIT, GALLERY_LIMIT, ROOM_PHOTO_LIMIT } from "@stayzim/sites";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { lodgeJson, photoJson, type LodgeVariables } from "../lib/lodge";
import { MAX_UPLOAD_BYTES, removeUploads, saveImage } from "../lib/uploads";
import { validJson } from "../lib/validate";

/** Each room card shows up to 5 photos; the gallery holds more. */
export const MAX_ROOM_PHOTOS = ROOM_PHOTO_LIMIT;
export const MAX_GALLERY_PHOTOS = GALLERY_LIMIT;

const dimension = z.coerce.number().int().min(1).max(10_000);

const uploadFields = z.object({
  width: dimension,
  height: dimension,
  roomId: z.string().min(1).optional(),
  caption: z.string().trim().max(CAPTION_LIMIT).optional(),
});

async function findPhoto(lodgeId: string, photoId: string) {
  const photo = await prisma.photo.findFirst({ where: { id: photoId, lodgeId } });
  if (!photo) throw new HTTPException(404, { message: "That photo no longer exists" });
  return photo;
}

/** Closes gaps in the order after a photo leaves the gallery or a room. */
async function renumber(lodgeId: string, roomId: string | null) {
  const photos = await prisma.photo.findMany({ where: { lodgeId, roomId }, orderBy: { position: "asc" }, select: { id: true } });
  await prisma.$transaction(photos.map(({ id }, position) => prisma.photo.update({ where: { id }, data: { position } })));
}

/** /api/lodge/photos. Mounted under the lodge router, which checks the session and finds the lodge. */
export const photos = new Hono<{ Variables: LodgeVariables }>()
  /**
   * One photo per request (the dashboard uploads them one after another, so
   * each can show progress and retry). multipart/form-data: `file`, `width`,
   * `height`, `medium` and `small` (1280px and 640px copies of big photos) and
   * `roomId` for a room photo. Photos are resized on the phone first.
   */
  .post("/", bodyLimit({ maxSize: 3 * MAX_UPLOAD_BYTES + 64 * 1024 }), async (c) => {
    const lodgeId = c.var.lodgeId;
    const body = await c.req.parseBody();
    const fields = uploadFields.safeParse(body);
    if (!fields.success) throw new HTTPException(400, { message: "Upload the photo again" });
    const { width, height, roomId, caption } = fields.data;

    if (roomId) {
      const room = await prisma.room.findFirst({ where: { id: roomId, lodgeId }, select: { id: true } });
      if (!room) throw new HTTPException(404, { message: "That room no longer exists" });
    }
    const count = await prisma.photo.count({ where: { lodgeId, roomId: roomId ?? null } });
    const limit = roomId ? MAX_ROOM_PHOTOS : MAX_GALLERY_PHOTOS;
    if (count >= limit) {
      throw new HTTPException(400, { message: roomId ? `A room has up to ${limit} photos` : `The gallery holds up to ${limit} photos` });
    }

    const id = crypto.randomUUID();
    const { key, size } = await saveImage(body.file, `lodges/${lodgeId}`, id);
    // The phone also sends a smaller copy (`medium`) for big photos; lodge sites serve it to phones
    // The phone also sends smaller copies of big photos (`medium`, `small`); lodge sites serve those to phones
    let mediumKey: string | null = null;
    let smallKey: string | null = null;
    let photo;
    try {
      mediumKey = body.medium ? (await saveImage(body.medium, `lodges/${lodgeId}`, `${id}-md`)).key : null;
      smallKey = body.small ? (await saveImage(body.small, `lodges/${lodgeId}`, `${id}-sm`)).key : null;
      photo = await prisma.photo.create({
        data: { lodgeId, roomId: roomId ?? null, key, mediumKey, smallKey, width, height, size, caption: caption ?? "", position: count },
      });
    } catch (error) {
      // Don't leave files nobody points to
      await removeUploads([key, mediumKey, smallKey].filter((stored): stored is string => Boolean(stored)));
      throw error;
    }
    return c.json({ photo: photoJson(photo), lodge: await lodgeJson(lodgeId) }, 201);
  })

  .patch("/:id", validJson(z.object({ caption: z.string().trim().max(CAPTION_LIMIT, "Keep the caption short") })), async (c) => {
    const photo = await findPhoto(c.var.lodgeId, c.req.param("id"));
    await prisma.photo.update({ where: { id: photo.id }, data: c.req.valid("json") });
    return c.json(await lodgeJson(c.var.lodgeId));
  })

  .delete("/:id", async (c) => {
    const lodgeId = c.var.lodgeId;
    const photo = await findPhoto(lodgeId, c.req.param("id"));
    // Deleting the hero photo falls back to the first gallery photo (heroPhotoId is set null)
    await prisma.photo.delete({ where: { id: photo.id } });
    await renumber(lodgeId, photo.roomId);
    await removeUploads([photo.key, photo.mediumKey, photo.smallKey].filter((key): key is string => Boolean(key)));
    return c.json(await lodgeJson(lodgeId));
  })

  /** The new order of the gallery (no `roomId`) or of one room's photos, as every photo id. */
  .put(
    "/order",
    validJson(z.object({ roomId: z.string().nullable().default(null), ids: z.array(z.string()).max(MAX_GALLERY_PHOTOS) })),
    async (c) => {
      const lodgeId = c.var.lodgeId;
      const { roomId, ids } = c.req.valid("json");
      const existing = await prisma.photo.findMany({ where: { lodgeId, roomId }, select: { id: true } });
      const known = new Set(existing.map((photo) => photo.id));
      if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
        throw new HTTPException(409, { message: "Your photos changed in another tab. Reload and try again." });
      }
      await prisma.$transaction(ids.map((id, position) => prisma.photo.update({ where: { id }, data: { position } })));
      return c.json(await lodgeJson(lodgeId));
    },
  );
