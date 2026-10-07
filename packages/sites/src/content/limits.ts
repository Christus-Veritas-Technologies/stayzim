/**
 * Every limit on lodge content, in one place. The server validates with these
 * (schemas.ts) and the dashboard's forms show and check the same numbers.
 */

export const LODGE_LIMITS = {
  nameMin: 2,
  name: 80,
  description: 300,
  town: 60,
  region: 60,
  mapsUrl: 500,
} as const;

export const ROOM_LIMITS = {
  name: 60,
  priceMax: 10_000,
  sleepsMax: 30,
  unitsMax: 50,
  description: 400,
  beds: 60,
  sizeMin: 5,
  sizeMax: 1000,
} as const;

export const MAX_ROOMS = 30;
export const ROOM_PHOTO_LIMIT = 5;
export const GALLERY_LIMIT = 30;
export const CAPTION_LIMIT = 80;
/** Room cards on the site show this many amenity icons. */
export const AMENITIES_ON_CARD = 4;

export const GUEST_INFO_LIMITS = {
  rules: 10,
  rule: 120,
  policy: 600,
  faq: 8,
  question: 120,
  answer: 400,
} as const;

export const BOOKING_LIMITS = {
  maxNights: 60,
  /** How far ahead guests and owners can book */
  monthsAhead: 18,
  guestName: 80,
  message: 300,
  notes: 500,
  reason: 300,
  /** New requests a lodge takes from its site in one day */
  dailyRequests: 20,
  /** Days of availability one call returns */
  availabilityDays: 120,
} as const;

/** Pro sites: reviews and the journal, both entered by the StayZim team. */
export const CONTENT_LIMITS = {
  quotes: 12,
  quote: 400,
  author: 60,
  origin: 60,
  stayed: 40,
  source: 40,
  url: 500,
  postTitle: 120,
  postSlug: 80,
  excerpt: 240,
  body: 20_000,
  /** Journal posts a site lists on its home page */
  latestPosts: 3,
} as const;
