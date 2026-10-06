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
  // Starter: clean and quick, nothing moves
  {
    key: "starter-clear",
    name: "Clear",
    plan: "STARTER",
    description: "Name, rooms and the WhatsApp button, nothing in the way.",
    motion: "none",
    defaults: { headline: "{name}", subline: "Book your stay directly with us on WhatsApp." },
  },
  {
    key: "starter-simple",
    name: "Simple",
    plan: "STARTER",
    description: "A big photo on top, everything else in one column.",
    motion: "none",
    defaults: { headline: "Welcome to {name}", subline: "Comfortable rooms in {place}. Message us to book." },
  },
  {
    key: "starter-compact",
    name: "Compact",
    plan: "STARTER",
    description: "Rooms first, for guests who already know you.",
    motion: "none",
    defaults: { headline: "Stay at {name}", subline: "See our rooms and prices, then book on WhatsApp." },
  },

  // Growth: richer layouts with subtle motion
  {
    key: "growth-classic",
    name: "Classic",
    plan: "GROWTH",
    description: "Full-width hero, room cards with photos, gallery, map and contact.",
    motion: "subtle",
    defaults: { headline: "{name}", subline: "A place to rest in {place}. Book direct on WhatsApp." },
  },
  {
    key: "growth-panorama",
    name: "Panorama",
    plan: "GROWTH",
    description: "Wide photos lead, with the rooms laid out side by side.",
    motion: "subtle",
    defaults: { headline: "Wake up in {place}", subline: "{name}: book your room directly with us." },
  },
  {
    key: "growth-journal",
    name: "Journal",
    plan: "GROWTH",
    description: "Text-led and calm, like a travel magazine.",
    motion: "subtle",
    defaults: { headline: "A stay at {name}", subline: "Slow mornings, warm rooms and the best of {place}." },
  },

  // Pro: the most polished, with rich motion
  {
    key: "pro-signature",
    name: "Signature",
    plan: "PRO",
    description: "Cinematic hero, parallax photos and a sticky booking bar.",
    motion: "rich",
    defaults: { headline: "{name}", subline: "Your home in {place}. Reserve directly, no booking fees." },
  },
  {
    key: "pro-safari",
    name: "Safari",
    plan: "PRO",
    description: "Earthy and bold, made for lodges near parks and lakes.",
    motion: "rich",
    defaults: { headline: "Discover {place}", subline: "Unforgettable days and quiet nights at {name}." },
  },
  {
    key: "pro-horizon",
    name: "Horizon",
    plan: "PRO",
    description: "Minimal and premium, with large type and generous space.",
    motion: "rich",
    defaults: { headline: "{name}", subline: "Considered stays in {place}." },
  },
] as const satisfies readonly Template[];

export type TemplateKey = (typeof TEMPLATES)[number]["key"];

export const TEMPLATE_KEYS = TEMPLATES.map((template) => template.key) as [TemplateKey, ...TemplateKey[]];

/** The template each plan starts on, and falls back to after a downgrade. */
export const DEFAULT_TEMPLATE: Record<Plan, TemplateKey> = {
  STARTER: "starter-clear",
  GROWTH: "growth-classic",
  PRO: "pro-signature",
};

/** Owners write these themselves; longer text would break the hero on phones. */
export const HERO_LIMITS = { headline: 60, subline: 140 } as const;

export function findTemplate(key: string | null | undefined): Template | undefined {
  return TEMPLATES.find((template) => template.key === key);
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
