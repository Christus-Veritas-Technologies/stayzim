import type { Plan } from "../index";
import type { AmenityKey } from "./amenities";
import type { SiteCopy } from "../copy";
import type { SiteSamples } from "../samples";
import type { LodgeKind, Setting } from "./facts";
import type { FaqEntry, SocialKey, SocialLinks } from "./guest-info";
import type { SitePage } from "./pages";

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
  /** An example room on a demo site (never bookable; replaced by the owner's first room) */
  sample: boolean;
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
  /** The owner's description, or a generated welcome until they write one */
  description: string;
  town: string | null;
  region: string | null;
  country: string;
  kind: LodgeKind | null;
  setting: Setting | null;
  /** Generated text for every section (../copy), written from the lodge's facts */
  copy: SiteCopy;
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
  /**
   * How Book buttons work. whatsapp: they open a chat. request: guests pick
   * dates and send a request (Growth and Pro, with WhatsApp and a room shown).
   */
  booking: { mode: "whatsapp" | "request" };
  /** Pro sites with a score or quotes; null otherwise */
  reviews: SiteReviews | null;
  /** Pro: the latest journal posts, newest first (the journal page lists them all) */
  journal: SitePost[];
  /** Which sections are example content on a demo site (../samples) */
  samples: SiteSamples;
  /** The pages this site has, from its plan (./pages) */
  pages: SitePage[];
};

export type SiteSocialLink = { key: SocialKey; label: string; url: string };

/** One guest's words, from the lodge's listing */
export type SiteReview = { quote: string; author: string; origin: string | null; stayed: string | null; score: number | null };

/** Pro: the lodge's score where guests review it, and quotes the StayZim team picked */
export type SiteReviews = {
  /** 9.4 (out of 10) */
  score: number | null;
  count: number | null;
  /** "Booking.com" */
  source: string;
  /** The listing, to read every review */
  url: string | null;
  quotes: SiteReview[];
};

/** A journal post in a list (the body comes with GET /api/sites/:slug/journal/:post) */
export type SitePost = {
  slug: string;
  title: string;
  excerpt: string | null;
  /** YYYY-MM-DD */
  publishedOn: string;
  readMinutes: number;
  cover: SitePhoto | null;
};

/** A whole post: plain text, blank lines between paragraphs, "## " for headings */
export type SitePostFull = SitePost & { body: string };

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
  /** Sent along on the owner's View site links, so their own visits on their domain aren't counted */
  ownerVisitKey: string;
  name: string;
  description: string;
  town: string | null;
  region: string | null;
  country: string;
  /** What /create asked about the place (facts.ts): the copy is written from these */
  kind: LodgeKind | null;
  setting: Setting | null;
  roomsHint: number | null;
  priceHint: number | null;
  copySeed: number;
  /** The generated text the site shows wherever the owner hasn't written their own */
  copy: SiteCopy;
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
  /** The free .co.zw domain (DOMAIN_STILL_FREE): whether it's on offer, whether this lodge can claim it now, and its claim */
  freeDomain: { free: boolean; claimable: boolean; claim: { domain: string; status: "REQUESTED" | "READY"; createdAt: string; readyBy: string } | null };
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
  /** Site requests on free nights are confirmed straight away */
  autoConfirmBookings: boolean;
  /** Booking requests waiting for an answer (0 without the calendar) */
  bookingsWaiting: number;
  /** Today in the calendar (zeros without it) */
  today: { arriving: number; leaving: number; staying: number };
};

// --- Bookings (Growth and Pro; docs/cms/bookings.md) ---

export type BookingKind = "STAY" | "BLOCK";
export type BookingStatus = "REQUESTED" | "CONFIRMED" | "DECLINED" | "CANCELLED";

export type DashboardBooking = {
  id: string;
  /** "B-7K2Q" */
  reference: string;
  kind: BookingKind;
  status: BookingStatus;
  source: "SITE" | "OWNER";
  roomId: string;
  /** As it was when booked */
  roomName: string;
  /** YYYY-MM-DD, the first night */
  checkIn: string;
  /** YYYY-MM-DD, the morning they leave */
  checkOut: string;
  nights: number;
  quantity: number;
  guests: number | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  message: string | null;
  notes: string | null;
  /** Whole USD a night, as it was when booked */
  nightlyPrice: number;
  /** nightlyPrice × nights × quantity */
  total: number;
  /** A request nobody answered before its check-in day */
  expired: boolean;
  createdAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
};

/** GET /api/lodge/bookings: what overlaps a window of dates, and what the calendar needs to draw it. */
export type BookingsWindow = {
  from: string;
  to: string;
  rooms: { id: string; name: string; units: number; visible: boolean; price: number }[];
  bookings: DashboardBooking[];
  /** Nights where more are booked than the lodge has (after "how many" went down) */
  overbooked: { roomId: string; night: string; taken: number; units: number }[];
  /** Requests waiting for an answer */
  waiting: number;
  /** Whether the plan includes bookings; false: read-only (after a downgrade) */
  enabled: boolean;
};

/** GET /api/sites/:slug/availability: the nights each room is full, nothing about who booked. */
export type SiteAvailability = { from: string; to: string; rooms: { id: string; full: string[] }[] };
