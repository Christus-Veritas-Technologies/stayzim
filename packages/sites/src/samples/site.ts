/**
 * A whole demo site from what an owner has told /create so far, before their
 * lodge exists: the generated copy plus every example section, as a new
 * lodge's site will look. /preview/sample/{template} renders it beside the
 * form, so the preview is the design they picked, written for their place.
 */
import { DEFAULT_COUNTRY, type LodgeKind, type Setting } from "../content/facts";
import type { LiveSite } from "../content/types";
import { copyForLodge, welcomeDescription } from "../copy";
import { findTemplate, heroText } from "../index";
import { slugFromName } from "../slugs";
import { applySamples, NO_SAMPLES } from "./index";

export type SampleSiteInput = {
  template: string;
  name: string;
  town: string | null;
  country: string | null;
  kind: LodgeKind | null;
  setting: Setting | null;
  roomsHint: number | null;
  priceHint: number | null;
  themeColor: string;
  /** YYYY-MM-DD, for the example journal posts */
  today: string;
};

/** Shown until the owner has typed a name. */
export const SAMPLE_NAME = "Your lodge";

export function sampleSite(input: SampleSiteInput): LiveSite {
  const template = findTemplate(input.template) ?? findTemplate("growth-shoreline")!;
  const name = input.name.trim() || SAMPLE_NAME;
  const slug = slugFromName(name) || "your-lodge";
  const town = input.town?.trim() || null;
  const country = input.country?.trim() || DEFAULT_COUNTRY;
  const copy = copyForLodge(
    { slug, name, town, region: null, country, kind: input.kind, setting: input.setting, roomsHint: input.roomsHint, priceHint: input.priceHint, copySeed: 0, rooms: [] },
    heroText(template, { name, place: town, heroHeadline: null, heroSubline: null }),
  );
  const site: LiveSite = {
    status: "LIVE",
    demo: true,
    slug,
    customDomain: null,
    name,
    template: template.key,
    hero: copy.hero,
    description: welcomeDescription(copy),
    town,
    region: null,
    country,
    kind: input.kind,
    setting: input.setting,
    copy,
    // A placeholder number: Book buttons need one to show, and example rooms never open it
    whatsapp: "263770000000",
    phone: null,
    email: null,
    mapsUrl: null,
    latitude: null,
    longitude: null,
    themeColor: input.themeColor,
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
  return applySamples(site, { roomsHint: input.roomsHint, priceHint: input.priceHint, pro: template.plan === "PRO", today: input.today });
}
