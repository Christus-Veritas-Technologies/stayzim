import prisma from "@stayzim/db";
import { findTemplate, PLANS_LABEL, templateAllowed } from "@stayzim/sites";
import { lodgePatch } from "@stayzim/sites/schemas";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { lodgeJson, requireLodge, type LodgeVariables } from "../lib/lodge";
import { coordinatesFromMapsUrl } from "../lib/maps";
import { requireAuth, withSession } from "../lib/session";
import { MAX_UPLOAD_BYTES, removeUploads, saveImage } from "../lib/uploads";
import { validJson } from "../lib/validate";
import { billing } from "./billing";
import { bookings } from "./bookings";
import { photos } from "./photos";
import { requests } from "./requests";
import { rooms } from "./rooms";
import { stats } from "./stats";

/** /api/lodge: the signed-in owner's lodge, with its rooms and photos under it. */
export const lodge = new Hono<{ Variables: LodgeVariables }>()
  .use(withSession, requireAuth(), requireLodge)

  /** The owner's lodge with its rooms and photos. */
  .get("/", async (c) => c.json(await lodgeJson(c.var.lodgeId)))

  /** Lodge info: details, location and look. Send only what changed. */
  .patch("/", validJson(lodgePatch), async (c) => {
    const data = c.req.valid("json");
    if (data.heroPhotoId) {
      const photo = await prisma.photo.findFirst({
        where: { id: data.heroPhotoId, lodgeId: c.var.lodgeId, roomId: null },
        select: { id: true },
      });
      if (!photo) throw new HTTPException(400, { message: "Pick a photo from your gallery" });
    }
    if (data.template) {
      const template = findTemplate(data.template);
      if (!template) throw new HTTPException(400, { message: "Pick one of the templates" });
      const { plan } = await prisma.lodge.findUniqueOrThrow({ where: { id: c.var.lodgeId }, select: { plan: true } });
      if (!templateAllowed(template, plan)) {
        throw new HTTPException(403, { message: `${template.name} comes with the ${PLANS_LABEL[template.plan]} plan` });
      }
    }
    await prisma.lodge.update({ where: { id: c.var.lodgeId }, data });
    return c.json(await lodgeJson(c.var.lodgeId));
  })

  /** Coordinates from a pasted Google Maps link (short links are followed to Google only). */
  .post("/map-location", validJson(z.object({ url: z.string().trim().min(1).max(500) })), async (c) => {
    const found = await coordinatesFromMapsUrl(c.req.valid("json").url);
    if (!found) {
      throw new HTTPException(422, {
        message: "We couldn't find the pin in that link. Copy it from Share in Google Maps, or type the coordinates.",
      });
    }
    return c.json(found);
  })

  /** Setup checklist: the owner copied or shared their link. */
  .post("/shared", async (c) => {
    await prisma.lodge.updateMany({ where: { id: c.var.lodgeId, linkSharedAt: null }, data: { linkSharedAt: new Date() } });
    return c.json(await lodgeJson(c.var.lodgeId));
  })

  /** Replaces the logo. multipart/form-data with `file`. */
  .post("/logo", bodyLimit({ maxSize: MAX_UPLOAD_BYTES + 64 * 1024 }), async (c) => {
    const body = await c.req.parseBody();
    const lodgeId = c.var.lodgeId;
    const { key } = await saveImage(body.file, `lodges/${lodgeId}`, `logo-${crypto.randomUUID()}`);
    const previous = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { logoKey: true } });
    await prisma.lodge.update({ where: { id: lodgeId }, data: { logoKey: key } });
    if (previous.logoKey) await removeUploads([previous.logoKey]);
    return c.json(await lodgeJson(lodgeId));
  })

  .delete("/logo", async (c) => {
    const lodgeId = c.var.lodgeId;
    const previous = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { logoKey: true } });
    await prisma.lodge.update({ where: { id: lodgeId }, data: { logoKey: null } });
    if (previous.logoKey) await removeUploads([previous.logoKey]);
    return c.json(await lodgeJson(lodgeId));
  })

  .route("/billing", billing)
  .route("/bookings", bookings)
  .route("/rooms", rooms)
  .route("/photos", photos)
  .route("/requests", requests)
  .route("/", stats);
