/**
 * Example content for demo sites: rooms, gallery photos, guest info, reviews
 * and journal posts that show an owner what their site can look like before
 * they've added anything. Nothing here is stored. The API adds it to a demo
 * site's JSON, one section at a time, only where the owner has nothing yet, so
 * adding their first room replaces the example rooms. A paid site never shows
 * examples. Example rooms have "sample-" ids that no booking can use.
 */
import type { LodgeKind, Setting } from "../content/facts";
import type { AmenityKey } from "../content/amenities";
import type { LiveSite, SiteGalleryPhoto, SitePhoto, SitePostFull, SiteReviews, SiteRoom } from "../content/types";
import { hash } from "../copy/fill";
import { KIND_WORDS, NEUTRAL_KIND, NEUTRAL_WORDS, SETTING_WORDS } from "../copy/words";
import { SAMPLE_PHOTOS, type SamplePhotoFile, type SamplePhotoGroup } from "./photos";

export { SAMPLE_PHOTOS, type SamplePhotoGroup } from "./photos";

/** Which sections of a site are examples, so templates can label them. */
export type SiteSamples = { rooms: boolean; gallery: boolean; guestInfo: boolean; reviews: boolean; journal: boolean; map: boolean };

export const NO_SAMPLES: SiteSamples = { rooms: false, gallery: false, guestInfo: false, reviews: false, journal: false, map: false };

export const SAMPLE_ROOM_PREFIX = "sample-";

export function isSampleRoomId(id: string) {
  return id.startsWith(SAMPLE_ROOM_PREFIX);
}

const SAMPLE_PHOTO_PATH = "/samples/";

/** True for an example stock photo (gallery tiles mix them with the owner's own while they have fewer than 3). */
export function isSamplePhoto(url: string) {
  return url.startsWith(SAMPLE_PHOTO_PATH);
}

/** A stock photo as a site photo, from the web app's public folder (works on every lodge host). */
function samplePhoto(photo: SamplePhotoFile): SitePhoto {
  const base = `${SAMPLE_PHOTO_PATH}${photo.file}`;
  return {
    url: `${base}.jpg`,
    srcSet: `${base}-sm.jpg 640w, ${base}-md.jpg 1280w, ${base}.jpg 1600w`,
    width: photo.width,
    height: photo.height,
  };
}

/** `count` photos from the groups, in a stable order for this lodge. */
function photosFrom(key: string, groups: SamplePhotoGroup[], count: number) {
  const all = groups.flatMap((group) => SAMPLE_PHOTOS[group]);
  return all
    .map((photo) => ({ photo, rank: hash(`${key}:${photo.file}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count)
    .map((entry) => samplePhoto(entry.photo));
}

const ROOM_NAMES: Record<Setting | "any", readonly string[]> = {
  any: ["Garden Room", "Family Room", "Deluxe Double", "Twin Room", "Classic Double", "Courtyard Suite"],
  mountains: ["Forest Cottage", "Mist Suite", "Hillside Room", "Fireside Chalet", "Pine Room", "Highland Family Room"],
  lake: ["Lake View Room", "Shoreline Suite", "Waterside Chalet", "Sunset Room", "Harbour Twin", "Lakeside Family Room"],
  bush: ["Bush Chalet", "Acacia Room", "Safari Suite", "Baobab Family Room", "Mopane Twin", "Starbed Room"],
  river: ["River Room", "Riverside Suite", "Kingfisher Room", "Waterberry Chalet", "Fig Tree Twin", "River Family Room"],
  city: ["Classic Double", "Executive Room", "City Suite", "Twin Room", "Studio Room", "Family Room"],
  farm: ["Farmhouse Room", "Barn Suite", "Orchard Room", "Granary Cottage", "Meadow Twin", "Farmhouse Family Room"],
};

const KIND_ROOM_NAMES: Partial<Record<LodgeKind, readonly string[]>> = {
  camp: ["Safari Tent", "Luxury Tent", "Family Tent", "Honeymoon Tent", "Riverside Tent", "Chalet"],
  "self-catering": ["Studio Cottage", "One-bedroom Cottage", "Two-bedroom Cottage", "Family House", "Garden Flat", "Loft"],
  "holiday-home": ["Main Bedroom", "Garden Bedroom", "Twin Bedroom", "Family Room", "Loft Room", "Guest Suite"],
};

/** Room shapes: who it's for and what's in it. Prices scale from the lodge's typical price. */
const ROOM_SHAPES: readonly { sleeps: number; beds: string; size: number; scale: number; who: string }[] = [
  { sleeps: 2, beds: "1 queen bed", size: 24, scale: 1, who: "couples" },
  { sleeps: 2, beds: "2 single beds", size: 22, scale: 0.9, who: "friends travelling together" },
  { sleeps: 4, beds: "1 queen + 2 singles", size: 40, scale: 1.5, who: "families" },
  { sleeps: 2, beds: "1 king bed", size: 34, scale: 1.3, who: "a special stay" },
];

const SETTING_AMENITIES: Record<Setting | "any", readonly AmenityKey[]> = {
  any: ["wifi", "breakfast", "parking", "tv"],
  mountains: ["fireplace", "wifi", "bath", "breakfast"],
  lake: ["wifi", "aircon", "breakfast", "parking"],
  bush: ["breakfast", "braai", "parking", "aircon"],
  river: ["wifi", "braai", "breakfast", "parking"],
  city: ["wifi", "aircon", "tv", "parking"],
  farm: ["braai", "kitchen", "parking", "fireplace"],
};

/** "$80" rounded to a friendly price: nearest 5 under $100, nearest 10 above. */
function friendlyPrice(value: number) {
  const step = value < 100 ? 5 : 10;
  return Math.max(10, Math.round(value / step) * step);
}

/** How many example rooms a demo shows: the rooms the owner said they have, 3 to 4. */
export function sampleRoomCount(roomsHint: number | null) {
  return Math.min(4, Math.max(3, roomsHint ?? 3));
}

/** False until stock photos are added (pnpm --filter web sample-photos): examples then have no photos. */
export const HAS_SAMPLE_PHOTOS = Object.values(SAMPLE_PHOTOS).some((group) => group.length > 0);

/**
 * Three or four example rooms that look like the lodge's own: named for its
 * setting and type, priced around the price it gave, with photos.
 */
export function sampleRooms(input: { slug: string; kind: LodgeKind | null; setting: Setting | null; roomsHint: number | null; priceHint: number | null }): SiteRoom[] {
  const count = sampleRoomCount(input.roomsHint);
  const names = (input.kind && KIND_ROOM_NAMES[input.kind]) || ROOM_NAMES[input.setting ?? "any"];
  const words = input.setting ? SETTING_WORDS[input.setting] : NEUTRAL_WORDS;
  const kind = input.kind ? KIND_WORDS[input.kind] : NEUTRAL_KIND;
  const base = input.priceHint ?? 60;
  const amenities = SETTING_AMENITIES[input.setting ?? "any"];
  const start = hash(`${input.slug}:rooms`) % names.length;
  const photos = photosFrom(`${input.slug}:room-photos`, ["rooms"], count * 2);

  return ROOM_SHAPES.slice(0, count).map((shape, index) => {
    const name = names[(start + index) % names.length]!;
    return {
      id: `${SAMPLE_ROOM_PREFIX}${index + 1}`,
      name,
      price: friendlyPrice(base * shape.scale),
      sleeps: shape.sleeps,
      amenities: amenities.slice(0, 2 + (index % 3)) as AmenityKey[],
      photos: photos.slice(index * 2, index * 2 + 2),
      description: `A comfortable ${kind.room} with ${shape.beds}, made for ${shape.who}. Wake up to ${words.mornings}, and come back to a quiet room at the end of the day.`,
      beds: shape.beds,
      size: shape.size,
      sample: true,
    };
  });
}

/** Eight gallery photos: the setting, the outside, rooms and food. */
export function sampleGallery(input: { slug: string; setting: Setting | null }): SiteGalleryPhoto[] {
  const groups: SamplePhotoGroup[] = [...(input.setting ? [input.setting] : []), "outside", "rooms", "food"];
  return photosFrom(`${input.slug}:gallery`, groups, 8).map((photo) => ({ ...photo, caption: "" }));
}

/** Three example reviews, clearly labelled, with no score and no source. */
export function sampleReviews(name: string): SiteReviews {
  return {
    score: null,
    count: null,
    // No source: these aren't from anywhere, and templates say "via {source}"
    source: "",
    url: null,
    quotes: [
      { quote: `We loved our stay at ${name}. Clean, quiet and a warm welcome from the moment we arrived.`, author: "Tendai M.", origin: "Harare", stayed: null, score: null },
      { quote: "Booking on WhatsApp was so easy, and they answered every question we had before we came.", author: "Sarah K.", origin: "Johannesburg", stayed: null, score: null },
      { quote: "The perfect weekend away. We're already planning to come back with the kids.", author: "Farai & Rudo", origin: "Bulawayo", stayed: null, score: null },
    ],
  };
}

/** Two example journal posts, with bodies, for Pro demos. */
export function samplePosts(input: { name: string; town: string | null; setting: Setting | null; publishedOn: string }): SitePostFull[] {
  const words = input.setting ? SETTING_WORDS[input.setting] : NEUTRAL_WORDS;
  const where = input.town ?? "the area";
  return [
    {
      slug: "welcome-to-our-journal",
      title: `Welcome to the ${input.name} journal`,
      excerpt: "News from the lodge, ideas for your stay, and the little things that make this place special.",
      publishedOn: input.publishedOn,
      readMinutes: 2,
      cover: null,
      body: [
        `This is where we'll share news from ${input.name}: what's happening at the lodge, the best time to visit, and ideas for your stay in ${where}.`,
        "## What to expect",
        `Short posts, a few times a month. Things like the best walks nearby, what's in season, and what our guests have loved doing.`,
        "## Planning a visit?",
        "Message us on WhatsApp with your dates and we'll help you plan the rest.",
      ].join("\n\n"),
    },
    {
      slug: "a-perfect-weekend",
      title: `A perfect weekend in ${where}`,
      excerpt: `Two days, ${words.mornings} and ${words.evenings}: how we'd spend a weekend here.`,
      publishedOn: input.publishedOn,
      readMinutes: 3,
      cover: null,
      body: [
        `If you only have a weekend, here's how we'd spend it: ${words.mornings}, a long lunch, and ${words.evenings}.`,
        "## Saturday",
        `Start slowly with breakfast, then head out for ${words.doing}. Come back for a rest in the afternoon.`,
        "## Sunday",
        "A late breakfast, one last look at the view, and an easy drive home. Ask us for the best route.",
      ].join("\n\n"),
    },
  ];
}

/** Example check-in and check-out times, house rules, cancellation and questions, from the lodge's copy. */
export function sampleGuestInfo(copy: LiveSite["copy"]) {
  return {
    checkInFrom: "14:00",
    checkOutBy: "10:00",
    houseRules: copy.houseRules.slice(1),
    cancellationPolicy: copy.cancellation,
    faq: copy.faq,
  };
}

/** What applySamples needs beyond the site itself. */
export type SampleInput = { roomsHint: number | null; priceHint: number | null; pro: boolean; today: string };

/**
 * A demo site with example content wherever the owner has nothing yet, and
 * `samples` saying which sections are examples. Paid sites are returned as
 * they are.
 */
export function applySamples(site: LiveSite, input: SampleInput): LiveSite {
  if (!site.demo) return { ...site, samples: NO_SAMPLES };
  const samples: SiteSamples = {
    rooms: site.rooms.length === 0,
    gallery: site.gallery.length < 3,
    guestInfo: !site.checkInFrom && !site.checkOutBy && site.houseRules.length === 0 && site.faq.length === 0 && !site.cancellationPolicy,
    reviews: input.pro && (!site.reviews || site.reviews.quotes.length === 0),
    journal: input.pro && site.journal.length === 0,
    map: site.latitude === null && site.longitude === null && !site.mapsUrl,
  };
  const facts = { slug: site.slug, kind: site.kind, setting: site.setting, roomsHint: input.roomsHint, priceHint: input.priceHint };
  const gallery = samples.gallery ? [...site.gallery, ...sampleGallery(facts)].slice(0, 8) : site.gallery;
  return {
    ...site,
    rooms: samples.rooms ? sampleRooms(facts) : site.rooms,
    gallery,
    // The hero needs a photo too: the first example one, until they upload
    heroUrl: site.heroUrl ?? (samples.gallery ? (gallery[0]?.url ?? null) : null),
    heroSrcSet: site.heroUrl ? site.heroSrcSet : samples.gallery ? (gallery[0]?.srcSet ?? null) : null,
    ...(samples.guestInfo ? sampleGuestInfo(site.copy) : {}),
    reviews: samples.reviews ? sampleReviews(site.name) : site.reviews,
    journal: samples.journal ? samplePosts({ name: site.name, town: site.town, setting: site.setting, publishedOn: input.today }).map(({ body: _body, ...post }) => post) : site.journal,
    samples,
  };
}
