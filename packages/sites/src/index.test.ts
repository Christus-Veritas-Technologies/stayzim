import { describe, expect, test } from "bun:test";

import {
  DEFAULT_TEMPLATE,
  effectiveTemplate,
  fillCopy,
  findTemplate,
  heroText,
  normalizeDomain,
  PLAN_RANK,
  RETIRED_TEMPLATES,
  TEMPLATE_KEYS,
  TEMPLATES,
  templateAllowed,
} from "./index";

describe("the template catalog", () => {
  test("has three templates per plan, with unique keys", () => {
    expect(new Set(TEMPLATE_KEYS).size).toBe(TEMPLATES.length);
    for (const plan of ["STARTER", "GROWTH", "PRO"] as const) {
      expect(TEMPLATES.filter((template) => template.plan === plan)).toHaveLength(3);
    }
  });

  test("moves more on higher plans: Starter never, Growth subtly, Pro richly", () => {
    const motion = { STARTER: "none", GROWTH: "subtle", PRO: "rich" } as const;
    for (const template of TEMPLATES) expect(template.motion).toBe(motion[template.plan]);
  });

  test("gives each plan a default template from that plan", () => {
    for (const [plan, key] of Object.entries(DEFAULT_TEMPLATE)) {
      expect(findTemplate(key)?.plan).toBe(plan as keyof typeof PLAN_RANK);
    }
  });
});

describe("templateAllowed", () => {
  test("lets a plan use its own templates and every plan's below it", () => {
    const starter = findTemplate("starter-veranda")!;
    const pro = findTemplate("pro-courtyard")!;
    expect(templateAllowed(starter, "STARTER")).toBe(true);
    expect(templateAllowed(starter, "PRO")).toBe(true);
    expect(templateAllowed(pro, "GROWTH")).toBe(false);
    expect(templateAllowed(pro, "PRO")).toBe(true);
  });
});

describe("effectiveTemplate", () => {
  test("keeps an allowed choice", () => {
    expect(effectiveTemplate("growth-overlap", "PRO").key).toBe("growth-overlap");
  });

  test("falls back to the plan's default after a downgrade", () => {
    expect(effectiveTemplate("pro-canopy", "STARTER").key).toBe("starter-veranda");
    expect(effectiveTemplate("pro-canopy", "GROWTH").key).toBe("growth-shoreline");
  });

  test("falls back for no choice or an unknown key", () => {
    expect(effectiveTemplate(null, "PRO").key).toBe("pro-escarpment");
    expect(effectiveTemplate("gone-template", "GROWTH").key).toBe("growth-shoreline");
  });

  test("reads a key from before the designed templates as the design that replaced it", () => {
    expect(effectiveTemplate("growth-classic", "GROWTH").key).toBe("growth-shoreline");
    expect(effectiveTemplate("pro-safari", "PRO").key).toBe("pro-courtyard");
    for (const key of Object.values(RETIRED_TEMPLATES)) expect(findTemplate(key)?.key).toBe(key);
  });
});

describe("fillCopy", () => {
  test("fills the name and place", () => {
    expect(fillCopy("Wake up in {place} at {name}", { name: "Mist Valley", place: "Nyanga" })).toBe("Wake up in Nyanga at Mist Valley");
  });

  test("says Zimbabwe when the place isn't known", () => {
    expect(fillCopy("Discover {place}", { name: "Mist Valley", place: null })).toBe("Discover Zimbabwe");
  });
});

describe("heroText", () => {
  const lodge = { name: "Lakeview Cabins", place: "Kariba", heroHeadline: null, heroSubline: null };
  const safari = findTemplate("pro-escarpment")!;

  test("uses the template's copy when the owner hasn't written their own", () => {
    expect(heroText(safari, lodge)).toEqual({
      headline: "Wake up in Kariba.",
      subline: "Lakeview Cabins: a small place with a long view. Book direct, no booking fees.",
    });
  });

  test("prefers the owner's text, ignoring blank text", () => {
    expect(heroText(safari, { ...lodge, heroHeadline: "  Sunsets on the lake ", heroSubline: "   " })).toEqual({
      headline: "Sunsets on the lake",
      subline: "Lakeview Cabins: a small place with a long view. Book direct, no booking fees.",
    });
  });
});

describe("normalizeDomain", () => {
  test("keeps just the host, lowercase, without www", () => {
    expect(normalizeDomain("mistvalleylodge.co.zw")).toBe("mistvalleylodge.co.zw");
    expect(normalizeDomain("https://www.MistValleyLodge.co.zw/rooms?x=1")).toBe("mistvalleylodge.co.zw");
    expect(normalizeDomain(" lodge.example.com.:443 ")).toBe("lodge.example.com");
  });

  test("refuses anything that isn't a domain name", () => {
    for (const value of ["", "localhost", "mist valley.co.zw", "-mist.co.zw", "mist-.co.zw", "mist..co.zw", "192.168.1.10", "mist.co.z1", null, undefined]) {
      expect(normalizeDomain(value)).toBeNull();
    }
  });
});
