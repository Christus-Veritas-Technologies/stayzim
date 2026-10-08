/**
 * Lodge site templates: the catalog shared by apps/server (which checks what an
 * owner may pick) and apps/web (which renders them). Every template reads the
 * same lodge data, so any lodge works in any template.
 *
 * Each plan has three templates; a plan can use its own and every plan below it.
 * The plan sets the design quality and how much moves.
 */

export type Plan = "STARTER" | "GROWTH" | "PRO";

/** none: nothing moves. subtle: fades and rises. rich: parallax, staggered reveals, hover motion. */
export type MotionLevel = "none" | "subtle" | "rich";

export type Template = {
  key: string;
  name: string;
  plan: Plan;
  description: string;
  motion: MotionLevel;
  /** Hero text when the owner hasn't written their own. {name} and {place} are filled in. */
  defaults: { headline: string; subline: string };
};

export const PLAN_RANK: Record<Plan, number> = { STARTER: 0, GROWTH: 1, PRO: 2 };

export const PLANS_LABEL: Record<Plan, string> = { STARTER: "Starter", GROWTH: "Growth", PRO: "Pro" };

export const TEMPLATES = [
  // Starter: one page, one font, one theme colour. Nothing moves.
  {
    key: "starter-veranda",
    name: "Veranda",
    plan: "STARTER",
    description: "Rounded hero card with a price pill, then rooms, gallery and map.",
    motion: "none",
    defaults: { headline: "A quiet stay in {place}", subline: "Comfortable rooms at {name}. See our prices and book direct with us." },
  },
  {
    key: "starter-rondavel",
    name: "Rondavel",
    plan: "STARTER",
    description: "Full-bleed hero with the WhatsApp number on the edge, tall room cards and a dark map band.",
    motion: "none",
    defaults: { headline: "Sleep well in {place}", subline: "{name}: a small lodge with a warm welcome. Message us to book." },
  },
  {
    key: "starter-shade",
    name: "Shade",
    plan: "STARTER",
    description: "Classic serif lodge: amenity tiles, a theme-colour rooms band with prices, gallery and map.",
    motion: "none",
    defaults: { headline: "{name}", subline: "A place to rest in {place}. Book direct with us." },
  },

  // Growth: more layout, an enquiry bar with dates, subtle motion
  {
    key: "growth-shoreline",
    name: "Shoreline",
    plan: "GROWTH",
    description: "Pill navigation over a big photo, an enquiry bar with dates, a highlighted intro and rich room cards.",
    motion: "subtle",
    defaults: { headline: "Slow days in {place}", subline: "Rooms at {name}, each one ready for you. Pick your dates and book direct." },
  },
  {
    key: "growth-wordmark",
    name: "Wordmark",
    plan: "GROWTH",
    description: "A giant lodge-name wordmark, a pill enquiry bar, a room carousel and amenities worked out from the rooms.",
    motion: "subtle",
    defaults: { headline: "A lodge in {place}", subline: "Warm rooms and quiet mornings at {name}. Book direct, no booking fees." },
  },
  {
    key: "growth-overlap",
    name: "Overlap",
    plan: "GROWTH",
    description: "Glass navigation and a floating room card over the hero, an overlapping enquiry bar and a room carousel.",
    motion: "subtle",
    defaults: { headline: "Find your quiet stay.", subline: "Rooms at {name} in {place}. Booking takes a minute." },
  },

  // Pro: editorial, with reviews, a journal and rich motion
  {
    key: "pro-escarpment",
    name: "Escarpment",
    plan: "PRO",
    description: "Cinematic hero and enquiry bar, editorial room spreads, reviews and a journal.",
    motion: "rich",
    defaults: { headline: "Wake up in {place}.", subline: "{name}: a small place with a long view. Book direct, no booking fees." },
  },
  {
    key: "pro-courtyard",
    name: "Courtyard",
    plan: "PRO",
    description: "Dark split hero, a big statement with numbers, rooms as an expanding list, a filmstrip and the journal.",
    motion: "rich",
    defaults: { headline: "{name}", subline: "Rooms around one quiet house in {place}." },
  },
  {
    key: "pro-canopy",
    name: "Canopy",
    plan: "PRO",
    description: "Aerial hero, numbers from the rooms, an at-a-glance table, room cards, a review and the journal.",
    motion: "rich",
    defaults: { headline: "A quiet camp in {place}", subline: "{name}: a handful of rooms and a lot of quiet. Book direct with us." },
  },
] as const satisfies readonly Template[];

export type TemplateKey = (typeof TEMPLATES)[number]["key"];

export const TEMPLATE_KEYS = TEMPLATES.map((template) => template.key) as [TemplateKey, ...TemplateKey[]];

/** Keys from before the designed templates (October 2026), to the design that took each one's place. */
export const RETIRED_TEMPLATES: Record<string, TemplateKey> = {
  "starter-clear": "starter-veranda",
  "starter-simple": "starter-rondavel",
  "starter-compact": "starter-shade",
  "growth-classic": "growth-shoreline",
  "growth-panorama": "growth-wordmark",
  "growth-journal": "growth-overlap",
  "pro-signature": "pro-escarpment",
  "pro-safari": "pro-courtyard",
  "pro-horizon": "pro-canopy",
};

/** The template each plan starts on, and falls back to after a downgrade. */
export const DEFAULT_TEMPLATE: Record<Plan, TemplateKey> = {
  STARTER: "starter-veranda",
  GROWTH: "growth-shoreline",
  PRO: "pro-escarpment",
};

/** Owners write these themselves; longer text would break the hero on phones. */
export const HERO_LIMITS = { headline: 60, subline: 140 } as const;

export function findTemplate(key: string | null | undefined): Template | undefined {
  const current = key ? (RETIRED_TEMPLATES[key] ?? key) : key;
  return TEMPLATES.find((template) => template.key === current);
}

/** A plan can use its own templates and every plan's below it. */
export function templateAllowed(template: Pick<Template, "plan">, plan: Plan) {
  return PLAN_RANK[template.plan] <= PLAN_RANK[plan];
}

/** The template a lodge's site actually shows: its choice if the plan allows it, else the plan's default. */
export function effectiveTemplate(key: string | null | undefined, plan: Plan): Template {
  const chosen = findTemplate(key);
  if (chosen && templateAllowed(chosen, plan)) return chosen;
  return findTemplate(DEFAULT_TEMPLATE[plan])!;
}

/** Fills {name} and {place} in template copy. */
export function fillCopy(text: string, lodge: { name: string; place: string | null }) {
  return text
    .replaceAll("{name}", lodge.name)
    .replaceAll("{place}", lodge.place ?? "Zimbabwe")
    .trim();
}

/** The hero text a site shows: the owner's own, or the template's default. */
export function heroText(
  template: Template,
  lodge: { name: string; place: string | null; heroHeadline: string | null; heroSubline: string | null },
) {
  return {
    headline: lodge.heroHeadline?.trim() || fillCopy(template.defaults.headline, lodge),
    subline: lodge.heroSubline?.trim() || fillCopy(template.defaults.subline, lodge),
  };
}

/**
 * A lodge's own domain as we store and match it: lowercase, without the scheme,
 * path, port, trailing dot or "www." ("https://www.MistValley.co.zw/" →
 * "mistvalley.co.zw"). Null when it isn't a domain name.
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  const host = (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  if (host.length > 253 || !host.includes(".")) return null;
  const label = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
  const labels = host.split(".");
  if (!labels.every((part) => label.test(part))) return null;
  // The last label is a real top-level domain: letters only
  if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1]!)) return null;
  return host;
}

export * from "./plans";
export * from "./slugs";
export * from "./billing-dates";
export * from "./content/limits";
export * from "./content/amenities";
export * from "./content/dates";
export * from "./content/availability";
export * from "./content/guest-info";
export * from "./content/journal";
export * from "./content/facts";
export type * from "./content/types";
export { copyVars, siteCopy, type CopyFacts, type SiteCopy } from "./copy";
