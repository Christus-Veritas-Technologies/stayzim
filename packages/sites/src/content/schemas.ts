/**
 * zod schemas for lodge content: what clients may send (input), and what a
 * lodge site reads (publicSiteSchema, which fills defaults so an older or newer
 * API still renders). Imported as "@stayzim/sites/schemas" by the server and by
 * server-side web code only: keep zod out of browser bundles.
 */
import { z } from "zod";

import { HERO_LIMITS } from "../index";
import { AMENITY_KEYS } from "./amenities";
import { isDateString, nightsBetween } from "./dates";
import { SOCIAL_KEYS, socialLink, STAY_TIMES, type SocialLinks } from "./guest-info";
import { BOOKING_LIMITS, GUEST_INFO_LIMITS, LODGE_LIMITS, ROOM_LIMITS } from "./limits";
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

const stayTime = z
  .string()
  .nullable()
  .refine((value) => value === null || STAY_TIMES.includes(value), "Pick a time");

/** Each network's link, cleaned (https, @handles turned into links); empty ones are left out. */
const socialLinks = z.object(Object.fromEntries(SOCIAL_KEYS.map((key) => [key, z.string().max(300).optional()]))).transform((input, ctx) => {
  const links: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const value = (input as Record<string, string | undefined>)[key];
    if (!value) continue;
    const result = socialLink(key, value);
    if ("error" in result) ctx.addIssue({ code: "custom", message: result.error, path: [key] });
    else if (result.url) links[key] = result.url;
  }
  return links;
});

/** Guest info (docs/cms/guest-info.md). */
const guestInfo = {
  checkInFrom: stayTime,
  checkOutBy: stayTime,
  houseRules: z
    .array(z.string().trim().max(GUEST_INFO_LIMITS.rule, `Keep each rule under ${GUEST_INFO_LIMITS.rule} characters`))
    .max(GUEST_INFO_LIMITS.rules, `Up to ${GUEST_INFO_LIMITS.rules} house rules`)
    .transform((rules) => rules.filter(Boolean)),
  cancellationPolicy: optionalText(GUEST_INFO_LIMITS.policy, "The cancellation policy"),
  faq: z
    .array(
      z.object({
        q: z.string().trim().min(3, "Write the question").max(GUEST_INFO_LIMITS.question, `Keep each question under ${GUEST_INFO_LIMITS.question} characters`),
        a: z.string().trim().min(1, "Write the answer").max(GUEST_INFO_LIMITS.answer, `Keep each answer under ${GUEST_INFO_LIMITS.answer} characters`),
      }),
    )
    .max(GUEST_INFO_LIMITS.faq, `Up to ${GUEST_INFO_LIMITS.faq} questions`),
  socialLinks,
};

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
    ...guestInfo,
  })
  .partial();

/** A room's fields, without defaults (so a PATCH never resets what it didn't send). */
const roomFields = z.object({
  name: z.string().trim().min(1, "Add the room name").max(ROOM_LIMITS.name, `Keep the room name under ${ROOM_LIMITS.name} characters`),
  price: z
    .number({ error: "Add the price per night" })
    .int("Use whole dollars")
    .min(1, "Add the price per night")
    .max(ROOM_LIMITS.priceMax, "Check the price per night"),
  sleeps: z.number().int().min(1, "A room sleeps at least 1").max(ROOM_LIMITS.sleepsMax, "Check how many it sleeps"),
  amenities: z.array(z.enum(AMENITY_KEYS)).max(AMENITY_KEYS.length),
  units: z.number().int().min(1, "You have at least 1 of this room").max(ROOM_LIMITS.unitsMax, `Up to ${ROOM_LIMITS.unitsMax} of one room`),
  visible: z.boolean(),
  description: optionalText(ROOM_LIMITS.description, "The description"),
  beds: optionalText(ROOM_LIMITS.beds, "The beds"),
  size: z
    .number()
    .int("Use whole square metres")
    .min(ROOM_LIMITS.sizeMin, "Check the size in square metres")
    .max(ROOM_LIMITS.sizeMax, "Check the size in square metres")
    .nullable(),
});

/** POST /api/lodge/rooms: name, price and sleeps; the rest is optional. */
export const roomInput = roomFields.extend({
  amenities: roomFields.shape.amenities.default([]),
  units: roomFields.shape.units.default(1),
  visible: roomFields.shape.visible.default(true),
  description: roomFields.shape.description.default(null),
  beds: roomFields.shape.beds.default(null),
  size: roomFields.shape.size.default(null),
});

/** PATCH /api/lodge/rooms/:id: only what was sent changes. */
export const roomPatch = roomFields.partial();

// --- Bookings ---

const date = z.string().refine(isDateString, "Pick a date");

/** Check-in before check-out, and not too long a stay. Date ranges (how far ahead) are checked by the server, which knows today. */
type Stay = { checkIn: string; checkOut: string };

function stayDates<T extends z.ZodRawShape>(shape: T) {
  return z
    .object({ ...shape, checkIn: date, checkOut: date })
    .refine((stay) => (stay as Stay).checkOut > (stay as Stay).checkIn, { message: "Check-out is after check-in", path: ["checkOut"] })
    .refine((stay) => nightsBetween((stay as Stay).checkIn, (stay as Stay).checkOut) <= BOOKING_LIMITS.maxNights, {
      message: `A booking is up to ${BOOKING_LIMITS.maxNights} nights`,
      path: ["checkOut"],
    });
}

const guestCount = z.number().int().min(1, "At least 1 guest").max(200, "Check the number of guests");
const guestName = optionalText(BOOKING_LIMITS.guestName, "The name");

/** POST /api/lodge/bookings: a booking the owner took on WhatsApp or by phone. */
export const ownerBookingInput = stayDates({
  roomId: z.string().min(1),
  quantity: z.number().int().min(1).max(ROOM_LIMITS.unitsMax).default(1),
  guests: guestCount.nullable().default(null),
  guestName: guestName.default(null),
  guestPhone: phoneNumber("guest's").default(null),
  guestEmail: email.default(null),
  notes: optionalText(BOOKING_LIMITS.notes, "The note").default(null),
});

/** POST /api/lodge/bookings/blocks: dates the owner closed. No quantity: all of the room. */
export const blockInput = stayDates({
  roomId: z.string().min(1),
  quantity: z.number().int().min(1).max(ROOM_LIMITS.unitsMax).nullable().default(null),
  notes: optionalText(BOOKING_LIMITS.notes, "The note").default(null),
});

const reason = optionalText(BOOKING_LIMITS.reason, "The reason").optional();

/** PATCH /api/lodge/bookings/:id */
export const bookingAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("decline"), reason }),
  z.object({ action: z.literal("cancel"), reason }),
  z.object({
    action: z.literal("edit"),
    roomId: z.string().min(1).optional(),
    checkIn: date.optional(),
    checkOut: date.optional(),
    quantity: z.number().int().min(1).max(ROOM_LIMITS.unitsMax).optional(),
    guests: guestCount.nullable().optional(),
    guestName: guestName.optional(),
    guestPhone: phoneNumber("guest's").optional(),
    guestEmail: email.optional(),
    notes: optionalText(BOOKING_LIMITS.notes, "The note").optional(),
  }),
]);

/** POST /api/sites/:slug/bookings: a guest's request from the lodge site. */
export const bookingRequestInput = stayDates({
  roomId: z.string().min(1).max(64),
  guests: guestCount,
  name: z.string().trim().min(2, "Add your name").max(BOOKING_LIMITS.guestName),
  phone: phoneNumber("WhatsApp").refine((value) => value !== null, "Add your WhatsApp number"),
  email: email.default(null),
  message: optionalText(BOOKING_LIMITS.message, "Your note").default(null),
  /** Left empty by people; bots fill it in */
  website: z.string().max(200).optional(),
});

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
  description: z.string().nullable().default(null),
  beds: z.string().nullable().default(null),
  size: z.number().nullable().default(null),
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
  checkInFrom: z.string().nullable().default(null),
  checkOutBy: z.string().nullable().default(null),
  houseRules: z.array(z.string()).default([]),
  cancellationPolicy: z.string().nullable().default(null),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  socialLinks: z
    .array(z.object({ key: z.string(), label: z.string(), url: z.string() }))
    .default([])
    .transform((links) =>
      links.filter((link): link is { key: (typeof SOCIAL_KEYS)[number]; label: string; url: string } =>
        (SOCIAL_KEYS as readonly string[]).includes(link.key),
      ),
    ),
  booking: z.object({ mode: z.enum(["whatsapp", "request"]).catch("whatsapp") }).default({ mode: "whatsapp" }),
});

export const publicSiteSchema = z.discriminatedUnion("status", [
  z.object({ status: z.enum(["SUSPENDED", "DEMO_ENDED"]), slug: z.string(), name: z.string() }),
  liveSite,
]);

// The schema's output must be exactly the contract's type
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameAsContract: Same<z.output<typeof publicSiteSchema>, PublicSite> = true;
void sameAsContract;
