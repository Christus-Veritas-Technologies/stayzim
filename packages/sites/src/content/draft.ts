/**
 * Unsaved edits on a site, for the dashboard's live preview
 * (/preview/draft/{slug}/{template}?draft=…). The owner's draft goes over the
 * saved site, and the generated copy is written again when the facts it comes
 * from change, so the preview shows exactly what saving would show.
 */
import type { LodgeKind, Setting } from "./facts";
import type { FaqEntry } from "./guest-info";
import type { LiveSite } from "./types";
import { copyForLodge, welcomeDescription } from "../copy";
import { findTemplate, heroText } from "../index";
import { sampleGuestInfo } from "../samples";

export type SiteDraft = Partial<{
  name: string;
  description: string;
  town: string | null;
  region: string | null;
  country: string | null;
  kind: LodgeKind | null;
  setting: Setting | null;
  roomsHint: number | null;
  priceHint: number | null;
  copySeed: number;
  themeColor: string;
  heroHeadline: string | null;
  heroSubline: string | null;
  checkInFrom: string | null;
  checkOutBy: string | null;
  houseRules: string[];
  cancellationPolicy: string | null;
  faq: FaqEntry[];
}>;

/** The draft fields that the generated copy is written from. */
const COPY_FACTS = ["name", "town", "region", "country", "kind", "setting", "roomsHint", "priceHint", "copySeed"] as const;
const GUEST_INFO = ["checkInFrom", "checkOutBy", "houseRules", "cancellationPolicy", "faq"] as const;

/** A field is in the draft when it isn't undefined (null clears it). Saved facts the site JSON doesn't carry, from the dashboard's lodge. */
export type DraftBase = { roomsHint: number | null; priceHint: number | null; copySeed: number };

export function applyDraft(site: LiveSite, draft: SiteDraft, base: DraftBase): LiveSite {
  const name = draft.name?.trim() || site.name;
  const pick = <K extends keyof SiteDraft>(key: K, saved: NonNullable<SiteDraft[K]> | null) => (draft[key] !== undefined ? (draft[key] ?? null) : saved);
  const town = pick("town", site.town);
  const region = pick("region", site.region);
  const country = pick("country", site.country) || site.country;
  const kind = pick("kind", site.kind);
  const setting = pick("setting", site.setting);

  // The copy, written again only when one of its facts changed
  const rewrite = COPY_FACTS.some((key) => draft[key] !== undefined);
  const template = findTemplate(site.template);
  const copy = rewrite
    ? copyForLodge(
        {
          slug: site.slug,
          name,
          town,
          region,
          country,
          kind,
          setting,
          roomsHint: pick("roomsHint", base.roomsHint),
          priceHint: pick("priceHint", base.priceHint),
          copySeed: draft.copySeed ?? base.copySeed,
          rooms: site.rooms.filter((room) => !room.sample).map((room) => ({ visible: true, price: room.price })),
        },
        template ? heroText(template, { name, place: town, heroHeadline: null, heroSubline: null }) : undefined,
      )
    : site.copy;

  // Text the owner left to us follows the new copy; their own text stays
  const own = (field: "headline" | "subline") => {
    const key = field === "headline" ? "heroHeadline" : "heroSubline";
    if (draft[key] !== undefined) return draft[key]?.trim() || copy.hero[field];
    return site.hero[field] === site.copy.hero[field] ? copy.hero[field] : site.hero[field];
  };
  const description =
    draft.description !== undefined
      ? draft.description?.trim() || welcomeDescription(copy)
      : site.description === welcomeDescription(site.copy)
        ? welcomeDescription(copy)
        : site.description;

  // Guest info comes as a whole from its screen: all empty means the examples again (on a demo)
  let guestInfo: Partial<LiveSite> = {};
  let samples = site.samples;
  if (GUEST_INFO.some((key) => draft[key] !== undefined)) {
    const values = {
      checkInFrom: draft.checkInFrom ?? null,
      checkOutBy: draft.checkOutBy ?? null,
      houseRules: (draft.houseRules ?? []).map((rule) => rule.trim()).filter(Boolean),
      cancellationPolicy: draft.cancellationPolicy?.trim() || null,
      faq: (draft.faq ?? []).filter((entry) => entry.q.trim() && entry.a.trim()),
    };
    const empty = !values.checkInFrom && !values.checkOutBy && values.houseRules.length === 0 && !values.cancellationPolicy && values.faq.length === 0;
    guestInfo = empty && site.demo ? sampleGuestInfo(copy) : values;
    samples = { ...samples, guestInfo: empty && site.demo };
  }

  return {
    ...site,
    name,
    town,
    region,
    country,
    kind,
    setting,
    copy,
    themeColor: draft.themeColor ?? site.themeColor,
    hero: { headline: own("headline"), subline: own("subline") },
    description,
    ...guestInfo,
    samples,
  };
}
