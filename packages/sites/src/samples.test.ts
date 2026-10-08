import { describe, expect, test } from "bun:test";

import { siteCopy } from "./copy";
import type { LiveSite } from "./content/types";
import { applySamples, isSampleRoomId, NO_SAMPLES, sampleRooms } from "./samples";

const copy = siteCopy({ slug: "kudu", name: "Kudu Hill", town: "Kariba", region: null, country: "Zimbabwe", kind: "lodge", setting: "lake", roomCount: null, priceFrom: null, seed: 0 });

const site: LiveSite = {
  status: "LIVE",
  demo: true,
  slug: "kudu",
  customDomain: null,
  name: "Kudu Hill",
  template: "growth-shoreline",
  hero: copy.hero,
  description: "",
  town: "Kariba",
  region: null,
  country: "Zimbabwe",
  kind: "lodge",
  setting: "lake",
  copy,
  whatsapp: "263771234567",
  phone: null,
  email: null,
  mapsUrl: null,
  latitude: null,
  longitude: null,
  themeColor: "#1E4A3B",
  logoUrl: null,
  heroUrl: null,
  heroSrcSet: null,
  rooms: [],
  gallery: [],
  checkInFrom: null,
  checkOutBy: null,
  houseRules: [],
  cancellationPolicy: null,
  faq: [],
  socialLinks: [],
  booking: { mode: "whatsapp" },
  reviews: null,
  journal: [],
  samples: NO_SAMPLES,
};

const input = { roomsHint: 6, priceHint: 80, pro: true, today: "2026-10-08" };

describe("example content", () => {
  test("a new demo gets example rooms, guest info, reviews and posts, all marked", () => {
    const shown = applySamples(site, input);
    expect(shown.samples).toEqual({ rooms: true, gallery: true, guestInfo: true, reviews: true, journal: true, map: true });
    expect(shown.rooms.length).toBe(4);
    expect(shown.rooms.every((room) => room.sample && isSampleRoomId(room.id))).toBe(true);
    expect(shown.checkInFrom).toBe("14:00");
    expect(shown.faq.length).toBeGreaterThan(3);
    expect(shown.reviews?.quotes.length).toBe(3);
    expect(shown.journal.length).toBe(2);
  });

  test("example prices sit around the price the owner gave", () => {
    const prices = sampleRooms({ slug: "kudu", kind: "lodge", setting: "lake", roomsHint: 4, priceHint: 80 }).map((room) => room.price);
    expect(Math.min(...prices)).toBeGreaterThanOrEqual(60);
    expect(Math.max(...prices)).toBeLessThanOrEqual(140);
  });

  test("the owner's first room replaces the example rooms", () => {
    const room = { id: "r1", name: "River Suite", price: 120, sleeps: 2, amenities: [], photos: [], description: null, beds: null, size: null, sample: false };
    const shown = applySamples({ ...site, rooms: [room] }, input);
    expect(shown.samples.rooms).toBe(false);
    expect(shown.rooms).toEqual([room]);
  });

  test("a paid site never shows examples", () => {
    const shown = applySamples({ ...site, demo: false }, input);
    expect(shown.samples).toEqual(NO_SAMPLES);
    expect(shown.rooms).toEqual([]);
  });

  test("Starter and Growth demos get no example reviews or posts", () => {
    const shown = applySamples(site, { ...input, pro: false });
    expect(shown.samples.reviews).toBe(false);
    expect(shown.journal).toEqual([]);
  });
});
