import prisma from "@stayzim/db";
import { demoEnded, effectiveTemplate } from "@stayzim/sites";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
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

export type PhotoJson = {
  id: string;
  url: string;
  /** "small 640w, medium 1280w, full 1600w" when the photo has smaller copies, for <img srcset> */
  srcSet: string | null;
  width: number;
  height: number;
  size: number;
  caption: string;
  roomId: string | null;
};

export type RoomJson = {
  id: string;
  name: string;
  price: number;
  sleeps: number;
  amenities: string[];
  photos: PhotoJson[];
  updatedAt: Date;
};

/** GET /api/lodge, and what every lodge edit returns. Mirrored in apps/web/src/lib/lodge.ts. */
export type LodgeJson = {
  id: string;
  slug: string;
  /** The lodge's own domain, e.g. "mistvalleylodge.co.zw", when StayZim has set one up */
  customDomain: string | null;
  name: string;
  description: string;
  town: string | null;
  region: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  themeColor: string;
  /** The owner's pick (null: the plan's default) */
  template: string | null;
  /** What the site shows: the pick if the plan allows it, else the plan's default */
  siteTemplate: string;
  heroHeadline: string | null;
  heroSubline: string | null;
  logoUrl: string | null;
  heroPhotoId: string | null;
  heroUrl: string | null;
  heroSrcSet: string | null;
  plan: "STARTER" | "GROWTH" | "PRO";
  status: "DEMO" | "ACTIVE" | "OVERDUE" | "SUSPENDED";
  /** When a demo's site goes offline (DEMO only) */
  demoEndsAt: Date | null;
  /** A demo whose time is up: its site is offline until it's paid for */
  demoEnded: boolean;
  paidUntil: Date | null;
  linkSharedAt: Date | null;
  updatedAt: Date;
  rooms: RoomJson[];
  /** Photos not on a room, in order */
  gallery: PhotoJson[];
};

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
export async function lodgeJson(lodgeId: string): Promise<LodgeJson> {
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
    demoEndsAt: lodge.demoEndsAt,
    demoEnded: demoEnded(lodge, new Date()),
    paidUntil: lodge.paidUntil,
    linkSharedAt: lodge.linkSharedAt,
    updatedAt: lodge.updatedAt,
    rooms: lodge.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      price: room.price,
      sleeps: room.sleeps,
      amenities: room.amenities,
      photos: room.photos.map(photoJson),
      updatedAt: room.updatedAt,
    })),
    gallery,
  };
}

/** Digits only, with the country code: "+263 77 123 4567" → "263771234567". */
export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** A phone number with its country code, stored as digits only. Used by Lodge info and the start screen. */
export const phoneNumber = (label: string) =>
  z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value ? phoneDigits(value) : null))
    .refine((value) => value === null || !value.startsWith("2630"), "Remove the 0 at the start. The +263 is already added.")
    .refine((value) => value === null || /^\d{9,15}$/.test(value), `Check the ${label} number, with the country code`);
