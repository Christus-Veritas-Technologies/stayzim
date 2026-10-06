/**
 * zod schemas for lodge content: what clients may send (input), and what a
 * lodge site reads (publicSiteSchema, which fills defaults so an older or newer
 * API still renders). Imported as "@stayzim/sites/schemas" by the server and by
 * server-side web code only: keep zod out of browser bundles.
 */
import { z } from "zod";

import { HERO_LIMITS } from "../index";
import { AMENITY_KEYS } from "./amenities";
import { LODGE_LIMITS, ROOM_LIMITS } from "./limits";
import type { PublicSite } from "./types";

/** Digits only, with the country code: "+263 77 123 4567" → "263771234567". */
export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** A phone number with its country code, stored as digits only. */
export const phoneNumber = (label: string) =>
  z
    .string()
    .trim()
    .nullable()
    .transform((value) => (value ? phoneDigits(value) : null))
    .refine((value) => value === null || !value.startsWith("2630"), "Remove the 0 at the start. The +263 is already added.")
    .refine((value) => value === null || /^\d{9,15}$/.test(value), `Check the ${label} number, with the country code`);

/** Text that may be left empty: empty means "remove it" (null). */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long (${max} characters at most)`)
    .nullable()
    .transform((value) => value || null);

const email = z
  .string()
  .trim()
  .nullable()
  .transform((value) => value || null)
  .refine((value) => value === null || z.email().safeParse(value).success, "Check the email address");

/** PATCH /api/lodge: send only what changed. */
export const lodgePatch = z
  .object({
    name: z.string().trim().min(LODGE_LIMITS.nameMin, "Add your lodge name").max(LODGE_LIMITS.name, `Keep the name under ${LODGE_LIMITS.name} characters`),
    description: z.string().trim().max(LODGE_LIMITS.description, `Keep the description under ${LODGE_LIMITS.description} characters`),
    town: optionalText(LODGE_LIMITS.town, "Town"),
    region: optionalText(LODGE_LIMITS.region, "Province"),
    whatsapp: phoneNumber("WhatsApp"),
    phone: phoneNumber("phone"),
    email,
    mapsUrl: optionalText(LODGE_LIMITS.mapsUrl, "The map link"),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
    heroPhotoId: z.string().nullable(),
    template: z.string().min(1).max(40),
    heroHeadline: optionalText(HERO_LIMITS.headline, "The headline"),
    heroSubline: optionalText(HERO_LIMITS.subline, "The line under the headline"),
  })
  .partial();

/** POST /api/lodge/rooms. */
export const roomInput = z.object({
  name: z.string().trim().min(1, "Add the room name").max(ROOM_LIMITS.name, `Keep the room name under ${ROOM_LIMITS.name} characters`),
  price: z
    .number({ error: "Add the price per night" })
    .int("Use whole dollars")
    .min(1, "Add the price per night")
    .max(ROOM_LIMITS.priceMax, "Check the price per night"),
  sleeps: z.number().int().min(1, "A room sleeps at least 1").max(ROOM_LIMITS.sleepsMax, "Check how many it sleeps"),
  amenities: z.array(z.enum(AMENITY_KEYS)).max(AMENITY_KEYS.length).default([]),
});

/** PATCH /api/lodge/rooms/:id: send only what changed. */
export const roomPatch = roomInput.partial();

// --- What a lodge site reads. Every field added later gets a default here. ---

const sitePhoto = z.object({ url: z.string(), srcSet: z.string().nullable().catch(null), width: z.number(), height: z.number() });

const siteRoom = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  sleeps: z.number(),
  // Unknown amenities (from a newer API) are dropped rather than breaking the site
  amenities: z
    .array(z.string())
    .default([])
    .transform((keys) => keys.filter((key): key is (typeof AMENITY_KEYS)[number] => (AMENITY_KEYS as readonly string[]).includes(key))),
  photos: z.array(sitePhoto).default([]),
});

const liveSite = z.object({
  status: z.literal("LIVE"),
  demo: z.boolean().default(false),
  slug: z.string(),
  customDomain: z.string().nullable().default(null),
  name: z.string(),
  template: z.string(),
  hero: z.object({ headline: z.string(), subline: z.string() }),
  description: z.string().default(""),
  town: z.string().nullable().default(null),
  region: z.string().nullable().default(null),
  whatsapp: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  mapsUrl: z.string().nullable().default(null),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
  themeColor: z.string(),
  logoUrl: z.string().nullable().default(null),
  heroUrl: z.string().nullable().default(null),
  heroSrcSet: z.string().nullable().default(null),
  rooms: z.array(siteRoom).default([]),
  gallery: z.array(sitePhoto.extend({ caption: z.string().default("") })).default([]),
});

export const publicSiteSchema = z.discriminatedUnion("status", [
  z.object({ status: z.enum(["SUSPENDED", "DEMO_ENDED"]), slug: z.string(), name: z.string() }),
  liveSite,
]);

// The schema's output must be exactly the contract's type
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameAsContract: Same<z.output<typeof publicSiteSchema>, PublicSite> = true;
void sameAsContract;
