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
import {
  AMENITY_KEYS,
  AMENITY_LABELS,
  GRACE_DAYS,
  includesAnalytics,
  PLAN_PRICES,
  type AmenityKey,
  type DashboardLodge,
  type DashboardPhoto,
  type DashboardRoom,
  type LodgeStatus,
  type Plan,
} from "@stayzim/sites";

import { siteHost } from "@/lib/site-host";

/** GET /api/lodge: the dashboard's contract, shared with the server (packages/sites/src/content/types.ts). */
export type Photo = DashboardPhoto;
export type Room = DashboardRoom;
export type Lodge = DashboardLodge;
export type PlanKey = Plan;
export type { AmenityKey, LodgeStatus };

export { SITES_DOMAIN, siteHost, siteUrl } from "@/lib/site-host";

/** "Nyanga, Manicaland" */
export function lodgePlace(lodge: Pick<Lodge, "town" | "region">) {
  return [lodge.town, lodge.region].filter(Boolean).join(", ") || null;
}

export { AMENITIES_ON_CARD, AMENITY_KEYS, ROOM_PHOTO_LIMIT } from "@stayzim/sites";
/** The setup checklist asks for this many gallery photos. */
export const GALLERY_GOAL = 5;

const AMENITY_ICONS = {
  wifi: Wifi,
  braai: Flame,
  fireplace: FlameKindling,
  parking: Car,
  kitchen: CookingPot,
  breakfast: Coffee,
  bath: Bath,
  aircon: Snowflake,
  pool: Waves,
  tv: Tv,
} satisfies Record<AmenityKey, LucideIcon>;

/** Each amenity's label (shared with the server) and icon. */
export const AMENITIES = Object.fromEntries(
  AMENITY_KEYS.map((key) => [key, { label: AMENITY_LABELS[key], icon: AMENITY_ICONS[key] }]),
) as Record<AmenityKey, { label: string; icon: LucideIcon }>;

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
    price: PLAN_PRICES.STARTER,
    pitch: "For guesthouses that just need to be online.",
    features: ["Lodge site on stayzim.co.zw", "Rooms, gallery and map", "Book on WhatsApp button", "Google Business setup", "Connect a domain you have"],
  },
  GROWTH: {
    name: "Growth",
    tagline: "Get booked",
    price: PLAN_PRICES.GROWTH,
    pitch: "For most lodges. See who visits.",
    features: ["Everything in Starter", "Booking calendar: guests request dates on your site", "Visitor analytics", "A free .co.zw domain"],
  },
  PRO: {
    name: "Pro",
    tagline: "Get full",
    price: PLAN_PRICES.PRO,
    pitch: "For busy lodges with 5 or more rooms.",
    features: ["Everything in Growth", "We manage your Booking.com and Airbnb listings", "Priority WhatsApp support"],
  },
};

export const PLAN_ORDER: PlanKey[] = ["STARTER", "GROWTH", "PRO"];

/** Visitor analytics come with Growth and Pro, demos included. */
export function hasAnalytics(lodge: Pick<Lodge, "plan">) {
  return includesAnalytics(lodge.plan);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Milliseconds left in a demo; 0 once it has ended (or for a lodge that isn't a demo). */
export function demoTimeLeft(lodge: Pick<Lodge, "status" | "demoEndsAt">, now = Date.now()) {
  if (lodge.status !== "DEMO" || !lodge.demoEndsAt) return 0;
  return Math.max(0, new Date(lodge.demoEndsAt).getTime() - now);
}

/** "1 day 4 h", "5 h", "40 min": a demo's time left, short enough for a pill. */
export function formatTimeLeft(ms: number) {
  if (ms <= 0) return "0 min";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  if (days > 0) return hours > 0 ? `${days} ${days === 1 ? "day" : "days"} ${hours} h` : `${days} ${days === 1 ? "day" : "days"}`;
  if (hours > 0) return `${hours} h`;
  return `${Math.max(1, Math.ceil(ms / MINUTE))} min`;
}

export { GRACE_DAYS };

/** When the next payment is due: the end of the demo or of the paid period. */
export function dueDate(lodge: Pick<Lodge, "status" | "demoEndsAt" | "paidUntil">) {
  const date = lodge.status === "DEMO" ? lodge.demoEndsAt : lodge.paidUntil;
  return date ? new Date(date) : null;
}

/** When the site goes offline without payment: right as a demo ends, GRACE_DAYS after a paid period ends. */
export function offlineDate(lodge: Pick<Lodge, "status" | "demoEndsAt" | "paidUntil">) {
  const due = dueDate(lodge);
  if (!due) return null;
  return lodge.status === "DEMO" ? due : new Date(due.getTime() + GRACE_DAYS * DAY);
}

export type SetupStep = { key: "rooms" | "photos" | "whatsapp" | "guest-info" | "share"; label: string; done: boolean };

/** What makes a lodge site ready to share. */
export function setupSteps(lodge: Lodge): SetupStep[] {
  return [
    { key: "rooms", label: "Add rooms", done: lodge.rooms.some((room) => room.visible) },
    { key: "photos", label: "Upload photos", done: lodge.gallery.length >= GALLERY_GOAL },
    { key: "whatsapp", label: "Check your WhatsApp number", done: Boolean(lodge.whatsapp) },
    { key: "guest-info", label: "Add guest info", done: Boolean(lodge.checkInFrom) && lodge.faq.length > 0 },
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

/** The "+263" shown before a number box, dropped once the number has its own country code. */
export function dialPrefix(text: string) {
  return text.trim().startsWith("+") ? null : "+263";
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
