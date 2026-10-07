import { findTemplate } from "@stayzim/sites";
import { describe, expect, test } from "bun:test";

import { bookingUrl, withTemplate, type LiveSite } from "./site";

const site: LiveSite = {
  status: "LIVE",
  demo: false,
  slug: "mistvalley",
  customDomain: null,
  name: "Mist Valley Lodge",
  template: "growth-classic",
  hero: { headline: "Mist Valley Lodge", subline: "A place to rest in Nyanga, Manicaland. Book direct with us." },
  description: "",
  town: "Nyanga",
  region: "Manicaland",
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
};

describe("bookingUrl", () => {
  test("opens the lodge's chat with the room typed in", () => {
    const url = new URL(bookingUrl(site, "River Suite")!);
    expect(url.pathname).toBe("/263771234567");
    expect(url.searchParams.get("text")).toBe("Hi Mist Valley Lodge, I'd like to book the River Suite. My dates are: ");
  });

  test("is null without a WhatsApp number, so templates hide the button", () => {
    expect(bookingUrl({ ...site, whatsapp: null })).toBeNull();
  });
});

describe("withTemplate", () => {
  test("swaps default hero text for the other template's default", () => {
    const preview = withTemplate(site, findTemplate("pro-safari")!);
    expect(preview.template).toBe("pro-safari");
    expect(preview.hero.headline).toBe("Discover Nyanga, Manicaland");
  });

  test("keeps hero text the owner wrote", () => {
    const own = { ...site, hero: { headline: "Fires, mist and trout", subline: "Our own words" } };
    expect(withTemplate(own, findTemplate("pro-safari")!).hero).toEqual(own.hero);
  });
});
