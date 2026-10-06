import { describe, expect, test } from "bun:test";

import {
  DEFAULT_TEMPLATE,
  effectiveTemplate,
  fillCopy,
  findTemplate,
  heroText,
  PLAN_RANK,
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
    const starter = findTemplate("starter-clear")!;
    const pro = findTemplate("pro-safari")!;
    expect(templateAllowed(starter, "STARTER")).toBe(true);
    expect(templateAllowed(starter, "PRO")).toBe(true);
    expect(templateAllowed(pro, "GROWTH")).toBe(false);
    expect(templateAllowed(pro, "PRO")).toBe(true);
  });
});

describe("effectiveTemplate", () => {
  test("keeps an allowed choice", () => {
    expect(effectiveTemplate("growth-journal", "PRO").key).toBe("growth-journal");
  });

  test("falls back to the plan's default after a downgrade", () => {
    expect(effectiveTemplate("pro-horizon", "STARTER").key).toBe("starter-clear");
    expect(effectiveTemplate("pro-horizon", "GROWTH").key).toBe("growth-classic");
  });

  test("falls back for no choice or an unknown key", () => {
    expect(effectiveTemplate(null, "PRO").key).toBe("pro-signature");
    expect(effectiveTemplate("gone-template", "GROWTH").key).toBe("growth-classic");
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
  const safari = findTemplate("pro-safari")!;

  test("uses the template's copy when the owner hasn't written their own", () => {
    expect(heroText(safari, lodge)).toEqual({
      headline: "Discover Kariba",
      subline: "Unforgettable days and quiet nights at Lakeview Cabins.",
    });
  });

  test("prefers the owner's text, ignoring blank text", () => {
    expect(heroText(safari, { ...lodge, heroHeadline: "  Sunsets on the lake ", heroSubline: "   " })).toEqual({
      headline: "Sunsets on the lake",
      subline: "Unforgettable days and quiet nights at Lakeview Cabins.",
    });
  });
});
