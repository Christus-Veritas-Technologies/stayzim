import type { Plan } from "../index";
import type { AmenityKey } from "./amenities";
import type { FaqEntry, SocialKey, SocialLinks } from "./guest-info";

/**
 * The lodge content contract: what the API sends, typed once for the server
 * (which checks its JSON with `satisfies`) and the web app (which renders it).
 *
 * Rules (docs/cms/README.md):
 * - Additive only: a field is never renamed or removed, and new ones have defaults.
 * - Optional fields are null or an empty list, never missing and never "".
 * - Dates are ISO strings, as they arrive over JSON.
 */

export type LodgeStatus = "DEMO" | "ACTIVE" | "OVERDUE" | "SUSPENDED";

// --- What a lodge site receives (GET /api/sites/:slug) ---

export type SitePhoto = {
  url: string;
  /** "small 640w, medium 1280w, full 1600w" when the photo has smaller copies, for <img srcset> */
  srcSet: string | null;
  width: number;
  height: number;
};

export type SiteGalleryPhoto = SitePhoto & { caption: string };

/** A room as every template sees it. Only rooms the owner shows on the site are sent. */
export type SiteRoom = {
  id: string;
  name: string;
  /** Whole USD a night */
  price: number;
  sleeps: number;
  amenities: AmenityKey[];
  /** The first is the cover; may be empty */
  photos: SitePhoto[];
  /** Plain text, line breaks kept */
  description: string | null;
  /** "1 queen + 2 singles" */
  beds: string | null;
  /** Square metres */
  size: number | null;
};

export type LiveSite = {
  status: "LIVE";
  /** Not paid for yet: the site shows "This is a demo" badges */
  demo: boolean;
  slug: string;
  /** The lodge's own domain: its canonical address when set */
  customDomain: string | null;
  name: string;
  /** Template key, already checked against the plan */
  template: string;
  hero: { headline: string; subline: string };
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
  heroUrl: string | null;
  /** `srcset` for the hero, so phones get a smaller copy */
  heroSrcSet: string | null;
  rooms: SiteRoom[];
  gallery: SiteGalleryPhoto[];
  /** "14:00"; null when the owner hasn't said */
  checkInFrom: string | null;
  checkOutBy: string | null;
  houseRules: string[];
  cancellationPolicy: string | null;
  faq: FaqEntry[];
  /** In display order, only the ones the owner filled in */
  socialLinks: SiteSocialLink[];
};

export type SiteSocialLink = { key: SocialKey; label: string; url: string };

export type PublicSite = { status: "SUSPENDED" | "DEMO_ENDED"; slug: string; name: string } | LiveSite;

// --- What the dashboard receives (GET /api/lodge, and every lodge edit) ---

export type DashboardPhoto = {
  id: string;
  url: string;
  srcSet: string | null;
  width: number;
  height: number;
  size: number;
  caption: string;
  roomId: string | null;
};

export type DashboardRoom = {
  id: string;
  name: string;
  price: number;
  sleeps: number;
  amenities: AmenityKey[];
  photos: DashboardPhoto[];
  description: string | null;
  beds: string | null;
  size: number | null;
  /** How many of this room the lodge has, 1 or more */
  units: number;
  /** false: hidden from the site */
  visible: boolean;
  /** Confirmed stays from today (0 without the bookings calendar) */
  upcomingBookings: number;
  updatedAt: string;
};

export type DashboardLodge = {
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
  /** The owner's own hero text; null shows the template's */
  heroHeadline: string | null;
  heroSubline: string | null;
  logoUrl: string | null;
  heroPhotoId: string | null;
  heroUrl: string | null;
  heroSrcSet: string | null;
  plan: Plan;
  status: LodgeStatus;
  /** When a demo's site goes offline (DEMO only) */
  demoEndsAt: string | null;
  /** A demo whose time is up: its site is offline until it's paid for */
  demoEnded: boolean;
  paidUntil: string | null;
  linkSharedAt: string | null;
  updatedAt: string;
  rooms: DashboardRoom[];
  /** Photos not on a room, in order */
  gallery: DashboardPhoto[];
  checkInFrom: string | null;
  checkOutBy: string | null;
  houseRules: string[];
  cancellationPolicy: string | null;
  faq: FaqEntry[];
  socialLinks: SocialLinks;
};
