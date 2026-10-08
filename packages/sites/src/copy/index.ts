/**
 * The copy engine: every text a lodge site shows, written from what the owner
 * told us (name, town, country, type of place, setting, rooms and prices).
 * No AI and no network: it picks from the lines in lines.ts with a stable hash,
 * so each lodge reads differently and the same lodge always reads the same.
 * The owner's own text (headline, description, FAQ, rules) always wins; this
 * is what shows until they write theirs. docs/cms/copy.md explains it.
 */
import { HERO_LIMITS } from "../index";
import type { LodgeKind, Setting } from "../content/facts";
import { canFill, fill, picker, type CopyVars } from "./fill";
import { CANCELLATION, EXPERIENCES, FAQS, HOUSE_RULES, LINES, type Pool, type Slot } from "./lines";
import { KIND_WORDS, NEUTRAL_KIND, NEUTRAL_WORDS, SETTING_WORDS } from "./words";

export type CopyFacts = {
  /** Keeps a lodge's wording stable, and different from other lodges' */
  slug: string;
  name: string;
  town: string | null;
  region: string | null;
  country: string | null;
  kind: LodgeKind | null;
  setting: Setting | null;
  /** Rooms on the site, or the owner's guess when there are none yet */
  roomCount: number | null;
  /** The cheapest room, or the owner's guess */
  priceFrom: number | null;
  /** Bumped by "Try other wording" */
  seed: number;
};

export type SiteCopy = {
  hero: { headline: string; subline: string };
  welcome: { title: string; body: string[] };
  highlights: string[];
  rooms: { intro: string; empty: string };
  gallery: { title: string; intro: string };
  location: { title: string; intro: string };
  contact: { title: string; intro: string };
  about: { title: string; body: string[] };
  experiences: { title: string; intro: string; items: { title: string; text: string }[] };
  reviews: { title: string; intro: string };
  journal: { title: string; intro: string };
  bookCta: string;
  meta: { description: string };
  /** Shown only on demo sites, until the owner writes their own */
  faq: { q: string; a: string }[];
  houseRules: string[];
  cancellation: string;
};

/** "4 rooms", "1 room", "3 tents" */
function count(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

/** Everything a line can say about this lodge. Missing facts stay empty, so lines that need them are skipped. */
export function copyVars(facts: CopyFacts): CopyVars {
  const words = facts.setting ? SETTING_WORDS[facts.setting] : NEUTRAL_WORDS;
  const kind = facts.kind ? KIND_WORDS[facts.kind] : NEUTRAL_KIND;
  const town = facts.town?.trim() || null;
  const place = [town, facts.region?.trim() || null].filter(Boolean).join(", ") || facts.country?.trim() || "Zimbabwe";
  return {
    name: facts.name.trim(),
    town,
    place,
    country: facts.country?.trim() || null,
    kind: kind.noun,
    kinds: kind.plural,
    Kind: kind.label,
    host: kind.host,
    view: words.view,
    mornings: words.mornings,
    evenings: words.evenings,
    landscape: words.country,
    air: words.air,
    doing: words.doing,
    rooms: kind.rooms,
    room: kind.room,
    roomCount: facts.roomCount ? count(facts.roomCount, kind.room, kind.rooms) : null,
    priceFrom: facts.priceFrom ? `$${facts.priceFrom}` : null,
  };
}

/**
 * A slot's lines for this lodge: the general ones plus its setting's and
 * type's. Those two count three times over, so a lake lodge mostly reads like
 * a lake lodge.
 */
function poolFor(pool: Pool, facts: CopyFacts) {
  const own = [...(facts.setting ? (pool.setting?.[facts.setting] ?? []) : []), ...(facts.kind ? (pool.kind?.[facts.kind] ?? []) : [])];
  return [...pool.any, ...own, ...own, ...own];
}

/**
 * All of a site's copy. `fallback` is the template's own hero text, used when
 * no generated line fits (a very long lodge name).
 */
export function siteCopy(facts: CopyFacts, fallback?: { headline: string; subline: string }): SiteCopy {
  const vars = copyVars(facts);
  const pick = picker(`${facts.slug}:${facts.seed}`, vars);
  const lines = (slot: Slot) => poolFor(LINES[slot], facts);
  const one = (slot: Slot, max?: number) => pick.one(slot, lines(slot), max) ?? "";
  // Items whose facts are missing are left out rather than shown with a gap
  const usable = <T extends { text?: string; a?: string }>(items: readonly T[]) => items.filter((item) => canFill(item.text ?? item.a ?? "", vars));
  const experiences = usable([...(facts.setting ? EXPERIENCES[facts.setting] : []), ...EXPERIENCES.any]);

  return {
    hero: {
      headline: pick.one("heroHeadline", lines("heroHeadline"), HERO_LIMITS.headline) ?? fallback?.headline ?? vars.name!,
      subline: pick.one("heroSubline", lines("heroSubline"), HERO_LIMITS.subline) ?? fallback?.subline ?? "",
    },
    welcome: { title: one("welcomeTitle", 60), body: [one("welcomeOpen"), ...pick.some("welcomeBody", lines("welcomeBody"), 2)].filter(Boolean) },
    highlights: pick.some("highlights", lines("highlights"), 3),
    rooms: { intro: one("roomsIntro"), empty: one("roomsEmpty") },
    gallery: { title: one("galleryTitle", 40), intro: one("galleryIntro") },
    location: { title: one("locationTitle", 40), intro: one("locationIntro") },
    contact: { title: one("contactTitle", 40), intro: one("contactIntro") },
    about: { title: one("aboutTitle", 50), body: pick.some("aboutBody", lines("aboutBody"), 4) },
    experiences: {
      title: one("experiencesTitle", 40),
      intro: one("experiencesIntro"),
      items: experiences.slice(0, 6).map((item) => ({ title: item.title, text: fill(item.text, vars) })),
    },
    reviews: { title: one("reviewsTitle", 40), intro: one("reviewsIntro") },
    journal: { title: one("journalTitle", 40), intro: one("journalIntro") },
    bookCta: one("bookCta", 24),
    meta: { description: one("metaDescription", 160) },
    faq: usable(FAQS)
      .slice(0, 6)
      .map((entry) => ({ q: entry.q, a: fill(entry.a, vars) })),
    houseRules: [...HOUSE_RULES],
    cancellation: CANCELLATION,
  };
}

export { LINES, EXPERIENCES, FAQS } from "./lines";
export { SETTING_WORDS, KIND_WORDS } from "./words";
export { hash } from "./fill";

/** What `copyForLodge` reads from a lodge (the dashboard's JSON has all of it). */
export type CopyLodge = {
  slug: string;
  name: string;
  town: string | null;
  region: string | null;
  country: string | null;
  kind: LodgeKind | null;
  setting: Setting | null;
  roomsHint: number | null;
  priceHint: number | null;
  copySeed: number;
  rooms: { visible: boolean; price: number }[];
};

/**
 * A lodge's copy: its real rooms set the count and the "from" price, and the
 * owner's guesses from /create stand in until there are any. `fallback` is the
 * template's own hero text, for names too long for any generated headline.
 */
export function copyForLodge(lodge: CopyLodge, fallback?: { headline: string; subline: string }) {
  const rooms = lodge.rooms.filter((room) => room.visible);
  return siteCopy(
    {
      slug: lodge.slug,
      name: lodge.name,
      town: lodge.town,
      region: lodge.region,
      country: lodge.country,
      kind: lodge.kind,
      setting: lodge.setting,
      roomCount: rooms.length || lodge.roomsHint,
      priceFrom: rooms.length > 0 ? Math.min(...rooms.map((room) => room.price)) : lodge.priceHint,
      seed: lodge.copySeed,
    },
    fallback,
  );
}

/** The welcome as one description (heading sentence, then a paragraph), for templates that show the lodge's description. */
export function welcomeDescription(copy: SiteCopy) {
  return [copy.welcome.title && `${copy.welcome.title.replace(/[.!?]$/, "")}.`, copy.welcome.body[0]].filter(Boolean).join(" ");
}
