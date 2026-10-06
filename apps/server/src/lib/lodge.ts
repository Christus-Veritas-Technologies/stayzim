import prisma from "@stayzim/db";
import { demoEnded, effectiveTemplate, isAmenity, type DashboardLodge, type DashboardPhoto, type DashboardRoom } from "@stayzim/sites";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthVariables } from "./session";
import { photoSrcSet, uploadUrl } from "./uploads";

export type LodgeVariables = AuthVariables & { lodgeId: string };

/** The signed-in owner's lodge, as `c.var.lodgeId`. 404 until they've made it at /start. */
export const requireLodge = createMiddleware<{ Variables: LodgeVariables }>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Sign in to continue" });
  const lodge = await prisma.lodge.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!lodge) throw new HTTPException(404, { message: "Your lodge isn't set up yet." });
  c.set("lodgeId", lodge.id);
  await next();
});

function loadLodge(lodgeId: string) {
  return prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    include: {
      rooms: { orderBy: { position: "asc" }, include: { photos: { orderBy: { position: "asc" } } } },
      photos: { where: { roomId: null }, orderBy: { position: "asc" } },
    },
  });
}

type StoredPhoto = {
  id: string;
  key: string;
  mediumKey: string | null;
  smallKey: string | null;
  width: number;
  height: number;
  size: number;
  caption: string;
  roomId: string | null;
};

export type PhotoJson = DashboardPhoto;
export type RoomJson = DashboardRoom;
/** GET /api/lodge, and what every lodge edit returns: the DashboardLodge contract in @stayzim/sites. */
export type LodgeJson = DashboardLodge;

export function photoJson(photo: StoredPhoto): PhotoJson {
  return {
    id: photo.id,
    url: uploadUrl(photo.key),
    srcSet: photoSrcSet(photo),
    width: photo.width,
    height: photo.height,
    size: photo.size,
    caption: photo.caption,
    roomId: photo.roomId,
  };
}

/** Everything the dashboard shows, in one response, so every edit can return it fresh. */
export async function lodgeJson(lodgeId: string): Promise<DashboardLodge> {
  const lodge = await loadLodge(lodgeId);
  const gallery = lodge.photos.map(photoJson);
  const hero = gallery.find((photo) => photo.id === lodge.heroPhotoId) ?? gallery[0] ?? null;

  return {
    id: lodge.id,
    slug: lodge.slug,
    customDomain: lodge.customDomain,
    name: lodge.name,
    description: lodge.description,
    town: lodge.town,
    region: lodge.region,
    whatsapp: lodge.whatsapp,
    phone: lodge.phone,
    email: lodge.email,
    mapsUrl: lodge.mapsUrl,
    latitude: lodge.latitude,
    longitude: lodge.longitude,
    themeColor: lodge.themeColor,
    template: lodge.template,
    siteTemplate: effectiveTemplate(lodge.template, lodge.plan).key,
    heroHeadline: lodge.heroHeadline,
    heroSubline: lodge.heroSubline,
    logoUrl: lodge.logoKey ? uploadUrl(lodge.logoKey) : null,
    heroPhotoId: hero?.id ?? null,
    heroUrl: hero?.url ?? null,
    heroSrcSet: hero?.srcSet ?? null,
    plan: lodge.plan,
    status: lodge.status,
    demoEndsAt: lodge.demoEndsAt?.toISOString() ?? null,
    demoEnded: demoEnded(lodge, new Date()),
    paidUntil: lodge.paidUntil?.toISOString() ?? null,
    linkSharedAt: lodge.linkSharedAt?.toISOString() ?? null,
    updatedAt: lodge.updatedAt.toISOString(),
    rooms: lodge.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      price: room.price,
      sleeps: room.sleeps,
      amenities: room.amenities.filter(isAmenity),
      photos: room.photos.map(photoJson),
      description: room.description || null,
      beds: room.beds || null,
      size: room.size,
      units: room.units,
      visible: room.visible,
      upcomingBookings: 0,
      updatedAt: room.updatedAt.toISOString(),
    })),
    gallery,
  };
}

export { phoneDigits, phoneNumber } from "@stayzim/sites/schemas";
