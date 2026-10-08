import { describe, expect, test } from "bun:test";

import { LODGE_KIND_KEYS, SETTING_KEYS, type LodgeKind, type Setting } from "./content/facts";
import { copyVars, siteCopy, type CopyFacts, type SiteCopy } from "./copy";
import { placeholders } from "./copy/fill";
import { EXPERIENCES, FAQS, LINES } from "./copy/lines";
import { HERO_LIMITS } from "./index";

const base: CopyFacts = {
  slug: "mist-valley",
  name: "Mist Valley Lodge",
  town: "Nyanga",
  region: "Manicaland",
  country: "Zimbabwe",
  kind: "lodge",
  setting: "mountains",
  roomCount: 4,
  priceFrom: 85,
  seed: 0,
};

/** Every string in the copy, flattened. */
function strings(copy: SiteCopy): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(copy);
  return out;
}

describe("copy lines", () => {
  test("every placeholder in every line is one the engine fills", () => {
    const known = new Set(Object.keys(copyVars(base)));
    const all: string[] = [];
    for (const pool of Object.values(LINES)) {
      all.push(...pool.any);
      for (const lines of Object.values(("setting" in pool ? pool.setting : {}) ?? {})) all.push(...(lines ?? []));
      for (const lines of Object.values(("kind" in pool ? pool.kind : {}) ?? {})) all.push(...(lines ?? []));
    }
    for (const items of Object.values(EXPERIENCES)) all.push(...items.map((item) => item.text));
    all.push(...FAQS.map((entry) => entry.a));
    const unknown = all.flatMap((line) => placeholders(line).filter((key) => !known.has(key)).map((key) => `{${key}} in "${line}"`));
    expect(unknown).toEqual([]);
  });

  test("there are plenty of variants for the main slots", () => {
    expect(LINES.heroHeadline.any.length).toBeGreaterThanOrEqual(10);
    expect(LINES.heroSubline.any.length).toBeGreaterThanOrEqual(8);
    expect(LINES.welcomeBody.any.length).toBeGreaterThanOrEqual(8);
    for (const setting of SETTING_KEYS) {
      expect(LINES.heroHeadline.setting[setting]?.length ?? 0).toBeGreaterThanOrEqual(4);
      expect(EXPERIENCES[setting].length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("siteCopy", () => {
  const settings: (Setting | null)[] = [...SETTING_KEYS, null];
  const kinds: (LodgeKind | null)[] = [...LODGE_KIND_KEYS, null];

  test("fills every slot for every type and setting, with or without a town", () => {
    for (const setting of settings) {
      for (const kind of kinds) {
        for (const town of ["Kariba", null]) {
          const copy = siteCopy({ ...base, setting, kind, town, region: town ? base.region : null });
          for (const text of strings(copy)) expect(text).not.toMatch(/[{}]/);
          expect(copy.hero.headline.length).toBeGreaterThan(0);
          expect(copy.hero.headline.length).toBeLessThanOrEqual(HERO_LIMITS.headline);
          expect(copy.hero.subline.length).toBeLessThanOrEqual(HERO_LIMITS.subline);
          expect(copy.welcome.body.length).toBeGreaterThanOrEqual(2);
          expect(copy.highlights).toHaveLength(3);
          expect(copy.experiences.items).toHaveLength(6);
          expect(copy.faq.length).toBeGreaterThanOrEqual(5);
          for (const field of [copy.welcome.title, copy.rooms.intro, copy.gallery.title, copy.location.intro, copy.contact.intro, copy.about.title, copy.meta.description]) {
            expect(field.length).toBeGreaterThan(0);
          }
          if (!town) for (const text of strings(copy)) expect(text).not.toMatch(/ in ,|\bin \.|  /);
        }
      }
    }
  });

  test("the same lodge always reads the same", () => {
    expect(siteCopy(base)).toEqual(siteCopy({ ...base }));
  });

  test("another seed or another lodge reads differently", () => {
    const first = strings(siteCopy(base)).join("|");
    expect(strings(siteCopy({ ...base, seed: 1 })).join("|")).not.toBe(first);
    const headlines = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((slug) => siteCopy({ ...base, slug }).hero.headline));
    expect(headlines.size).toBeGreaterThan(3);
  });

  test("a very long name falls back to the template's headline", () => {
    const name = "The Very Long Named Lodge And Conference Centre Of The Eastern Highlands";
    const copy = siteCopy({ ...base, name, town: null, region: null, setting: null, kind: null }, { headline: "A quiet stay", subline: "" });
    expect(copy.hero.headline.length).toBeLessThanOrEqual(HERO_LIMITS.headline);
  });

  test("uses the lodge's own facts, never a missing one", () => {
    const copy = siteCopy({ ...base, roomCount: null, priceFrom: null });
    for (const text of strings(copy)) expect(text).not.toMatch(/\$null|null rooms/);
  });
});
