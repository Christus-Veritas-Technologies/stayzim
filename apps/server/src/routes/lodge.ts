import prisma from "@stayzim/db";
import { findTemplate, HERO_LIMITS, PLANS_LABEL, templateAllowed } from "@stayzim/sites";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { lodgeJson, phoneDigits, requireLodge, type LodgeVariables } from "../lib/lodge";
import { coordinatesFromMapsUrl } from "../lib/maps";
import { requireAuth, withSession } from "../lib/session";
import { MAX_UPLOAD_BYTES, removeUploads, saveImage } from "../lib/uploads";
import { validJson } from "../lib/validate";
import { photos } from "./photos";
import { requests } from "./requests";
import { rooms } from "./rooms";
import { stats } from "./stats";

/** Empty text means "remove it". */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (${max} characters at most)`)
    .nullable()
    .transform((value) => value || null);

/** A phone number with its country code, stored as digits only. */
const phoneNumber = (label: string) =>
  z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value ? phoneDigits(value) : null))
    .refine((value) => value === null || !value.startsWith("2630"), "Remove the 0 at the start. The +263 is already added.")
    .refine((value) => value === null || /^\d{9,15}$/.test(value), `Check the ${label} number, with the country code`);

const lodgeUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Add your lodge name").max(80, "Keep the name under 80 characters"),
    description: z.string().trim().max(300, "Keep the description under 300 characters"),
    town: optionalText(60, "Town"),
    region: optionalText(60, "Province"),
    whatsapp: phoneNumber("WhatsApp"),
    phone: phoneNumber("phone"),
    email: z
      .string()
      .trim()
      .nullable()
      .transform((value) => value || null)
      .refine((value) => value === null || z.email().safeParse(value).success, "Check the email address"),
    mapsUrl: optionalText(500, "The map link"),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
    heroPhotoId: z.string().nullable(),
    template: z.string().min(1).max(40),
    heroHeadline: optionalText(HERO_LIMITS.headline, "The headline"),
    heroSubline: optionalText(HERO_LIMITS.subline, "The line under the headline"),
  })
  .partial();

/** /api/lodge: the signed-in owner's lodge, with its rooms and photos under it. */
export const lodge = new Hono<{ Variables: LodgeVariables }>()
  .use(withSession, requireAuth(), requireLodge)

  /** The owner's lodge with its rooms and photos. */
  .get("/", async (c) => c.json(await lodgeJson(c.var.lodgeId)))

  /** Lodge info: details, location and look. Send only what changed. */
  .patch("/", validJson(lodgeUpdateSchema), async (c) => {
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

  .route("/rooms", rooms)
  .route("/photos", photos)
  .route("/requests", requests)
  .route("/", stats);
