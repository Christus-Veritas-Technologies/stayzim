import {
  Bath,
  Car,
  Coffee,
  CookingPot,
  Flame,
  FlameKindling,
  Snowflake,
  Tv,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import { siteHost } from "@/lib/site-host";

/** GET /api/lodge (mirrors LodgeJson in apps/server/src/lib/lodge.ts; dates arrive as strings). */
export type Photo = {
  id: string;
  url: string;
  /** "small 640w, medium 1280w, full 1600w" when there are smaller copies, for <img srcset> */
  srcSet: string | null;
  width: number;
  height: number;
  size: number;
  caption: string;
  roomId: string | null;
};

export type Room = {
  id: string;
  name: string;
  price: number;
  sleeps: number;
  amenities: AmenityKey[];
  photos: Photo[];
  updatedAt: string;
};

export type PlanKey = "STARTER" | "GROWTH" | "PRO";
export type LodgeStatus = "TRIAL" | "ACTIVE" | "OVERDUE" | "SUSPENDED";

export type Lodge = {
  id: string;
  slug: string;
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
  logoUrl: string | null;
  /** The owner's pick from @stayzim/sites; null until they choose one */
  template: string | null;
  /** What the site shows: the pick, or the plan's default when the plan doesn't include it */
  siteTemplate: string;
  /** The owner's own hero text; null shows the template's */
  heroHeadline: string | null;
  heroSubline: string | null;
  heroPhotoId: string | null;
  heroUrl: string | null;
  heroSrcSet: string | null;
  plan: PlanKey;
  status: LodgeStatus;
  trialEndsAt: string | null;
  paidUntil: string | null;
  linkSharedAt: string | null;
  updatedAt: string;
  rooms: Room[];
  gallery: Photo[];
};

export { SITES_DOMAIN, siteHost, siteUrl } from "@/lib/site-host";

/** "Nyanga, Manicaland" */
export function lodgePlace(lodge: Pick<Lodge, "town" | "region">) {
  return [lodge.town, lodge.region].filter(Boolean).join(", ") || null;
}

export const ROOM_PHOTO_LIMIT = 5;
/** The setup checklist asks for this many gallery photos. */
export const GALLERY_GOAL = 5;

export const AMENITIES = {
  wifi: { label: "Wi-Fi", icon: Wifi },
  braai: { label: "Braai", icon: Flame },
  fireplace: { label: "Fireplace", icon: FlameKindling },
  parking: { label: "Parking", icon: Car },
  kitchen: { label: "Kitchen", icon: CookingPot },
  breakfast: { label: "Breakfast", icon: Coffee },
  bath: { label: "Bath", icon: Bath },
  aircon: { label: "Air con", icon: Snowflake },
  pool: { label: "Pool", icon: Waves },
  tv: { label: "TV", icon: Tv },
} satisfies Record<string, { label: string; icon: LucideIcon }>;

export type AmenityKey = keyof typeof AMENITIES;
export const AMENITY_KEYS = Object.keys(AMENITIES) as AmenityKey[];
/** Room cards on the site show this many amenity icons. */
export const AMENITIES_ON_CARD = 4;

/** Theme colours that read well on white with white text on top. */
export const THEME_COLORS = [
  { name: "Highland", value: "#1E4A3B" },
  { name: "Kariba", value: "#1D5F80" },
  { name: "Granite", value: "#3F4B4E" },
  { name: "Msasa", value: "#A7551F" },
  { name: "Jacaranda", value: "#6B55A3" },
  { name: "Teak", value: "#6B4A2F" },
] as const;

export function themeColorName(value: string) {
  return THEME_COLORS.find((color) => color.value.toLowerCase() === value.toLowerCase())?.name ?? "Custom";
}

export const PLANS: Record<
  PlanKey,
  { name: string; tagline: string; price: number; pitch: string; features: string[]; later?: string }
> = {
  STARTER: {
    name: "Starter",
    tagline: "Get found",
    price: 20,
    pitch: "For guesthouses that just need to be online.",
    features: ["Lodge site on stayzim.co.zw", "Rooms, gallery and map", "Book on WhatsApp button", "Google Business setup"],
  },
  GROWTH: {
    name: "Growth",
    tagline: "Get booked",
    price: 40,
    pitch: "For most lodges. See who visits.",
    features: ["Everything in Starter", "Visitor analytics"],
    later: "Custom domain and booking calendar, coming later",
  },
  PRO: {
    name: "Pro",
    tagline: "Get full",
    price: 75,
    pitch: "For busy lodges with 5 or more rooms.",
    features: ["Everything in Growth", "We manage your Booking.com and Airbnb listings", "Priority WhatsApp support"],
  },
};

export const PLAN_ORDER: PlanKey[] = ["STARTER", "GROWTH", "PRO"];

/** Visitor analytics come with Growth and Pro (and the Growth trial). */
export function hasAnalytics(lodge: Pick<Lodge, "plan">) {
  return lodge.plan !== "STARTER";
}

const DAY = 24 * 60 * 60 * 1000;

/** Whole days left in the trial, rounded up; 0 once it has ended. */
export function trialDaysLeft(lodge: Pick<Lodge, "trialEndsAt">, now = Date.now()) {
  if (!lodge.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(lodge.trialEndsAt).getTime() - now) / DAY));
}

/** Overdue sites stay up 3 more days after the due date. */
export const GRACE_DAYS = 3;

/** When the next payment is due: the end of the trial or of the paid period. */
export function dueDate(lodge: Pick<Lodge, "status" | "trialEndsAt" | "paidUntil">) {
  const date = lodge.status === "TRIAL" || !lodge.paidUntil ? lodge.trialEndsAt : lodge.paidUntil;
  return date ? new Date(date) : null;
}

export function offlineDate(lodge: Pick<Lodge, "status" | "trialEndsAt" | "paidUntil">) {
  const due = dueDate(lodge);
  return due ? new Date(due.getTime() + GRACE_DAYS * DAY) : null;
}

export type SetupStep = { key: "rooms" | "photos" | "whatsapp" | "share"; label: string; done: boolean };

/** The four things that make a lodge site ready to share. */
export function setupSteps(lodge: Lodge): SetupStep[] {
  return [
    { key: "rooms", label: "Add rooms", done: lodge.rooms.length > 0 },
    { key: "photos", label: "Upload photos", done: lodge.gallery.length >= GALLERY_GOAL },
    { key: "whatsapp", label: "Check your WhatsApp number", done: Boolean(lodge.whatsapp) },
    { key: "share", label: "Share your link", done: Boolean(lodge.linkSharedAt) },
  ];
}

/** "+263 77 123 4567" for Zimbabwean numbers, "+27 82…" as typed for others. */
export function formatPhone(digits: string | null) {
  if (!digits) return "";
  const zw = digits.match(/^263(\d{2})(\d{3})(\d{4})$/);
  if (zw) return `+263 ${zw[1]} ${zw[2]} ${zw[3]}`;
  return `+${digits}`;
}

export function formatPrice(dollars: number) {
  return `$${dollars.toLocaleString("en-ZW")}`;
}

/** The message owners send past guests, with their link in it. */
export function shareMessage(lodge: Pick<Lodge, "name" | "slug">) {
  return `Hi, ${lodge.name} has its own website now. See our rooms and book with us directly on WhatsApp: ${siteHost(lodge)}`;
}

/** Rooms without a photo show a grey card on the site. */
export function roomNeedsPhoto(room: Room) {
  return room.photos.length === 0;
}

/**
 * What goes in the "+263 [ ]" box: the number without 263, or the whole
 * number with its + for other countries.
 */
export function phoneToInput(digits: string | null) {
  if (!digits) return "";
  return digits.startsWith("263") ? digits.slice(3) : `+${digits}`;
}

/** The digits to store from what was typed, or the problem with it. */
export function phoneFromInput(text: string): { digits: string | null; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { digits: null };
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("2630")) return { digits: null, error: "Remove the 0 after +263." };
    return /^\d{9,15}$/.test(digits) ? { digits } : { digits: null, error: "Check the number and its country code." };
  }
  const local = trimmed.replace(/\D/g, "");
  if (local.startsWith("0")) return { digits: null, error: "Remove the 0 at the start. The +263 is already added." };
  if (local.length !== 9) return { digits: null, error: "Zimbabwean numbers have 9 digits after +263, like 77 123 4567." };
  return { digits: `263${local}` };
}
