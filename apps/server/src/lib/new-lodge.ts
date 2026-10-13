import prisma from "@stayzim/db";
import { DEFAULT_COUNTRY, DEFAULT_TEMPLATE, findTemplate, foundingOpen, isPlan, slugFromName, slugProblem, TEMPLATE_KEYS, templateAllowed } from "@stayzim/sites";
import { lodgeFacts } from "@stayzim/sites/schemas";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { phoneNumber } from "./lodge";

/**
 * Making a new lodge: from /create (the owner's own guest account) and from the
 * admin app (a placeholder guest account for a lead). Same fields, same rules.
 */

/** A utm_* value or the referrer, as the link carried it: short, or nothing. */
const source = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null)
    .catch(null);

export const newLodgeSchema = z.object({
  // /create starts every demo on Growth (the plan most lodges take) unless the link named one
  plan: z.string().refine(isPlan, "Pick a plan").default("GROWTH"),
  // The look picked on /create's first step. Left out: the plan's default
  template: z.enum(TEMPLATE_KEYS, "Pick one of the designs").optional(),
  name: z.string().trim().min(2, "Add your lodge name").max(80, "Keep the name under 80 characters"),
  // The town and the address can come later, from the dashboard
  town: z
    .string()
    .trim()
    .max(60, "Town is too long (60 characters at most)")
    .nullable()
    .optional()
    .transform((value) => value || null),
  region: z
    .string()
    .trim()
    .max(60, "Province is too long (60 characters at most)")
    .nullable()
    .optional()
    .transform((value) => value || null),
  whatsapp: phoneNumber("WhatsApp").refine((value) => value !== null, "Add the WhatsApp number guests should message"),
  // What kind of place it is, for the site's copy and the example rooms (all optional)
  country: lodgeFacts.country.optional(),
  kind: lodgeFacts.kind.optional(),
  setting: lodgeFacts.setting.optional(),
  roomsHint: lodgeFacts.roomsHint.optional(),
  priceHint: lodgeFacts.priceHint.optional(),
  // Left out by /create: the address is made from the name
  slug: z.string().trim().toLowerCase().optional(),
  utmSource: source(100),
  utmMedium: source(100),
  utmCampaign: source(150),
  utmContent: source(150),
  referrer: source(500),
});

export async function slugTaken(slug: string) {
  return (await prisma.lodge.count({ where: { slug } })) > 0;
}

/**
 * A free address close to the one asked for: "mist-valley", then
 * "mist-valley-nyanga", then "mist-valley-2", "-3"…
 */
export async function freeSlug(base: string, town: string | null) {
  if (!slugProblem(base) && !(await slugTaken(base))) return base;
  const candidates = [town ? slugFromName(`${base} ${town}`) : null, ...Array.from({ length: 20 }, (_, index) => `${base}-${index + 2}`)];
  for (const candidate of candidates) {
    if (candidate && !slugProblem(candidate) && !(await slugTaken(candidate))) return candidate;
  }
  return null;
}

export type NewLodge = z.infer<typeof newLodgeSchema>;

/**
 * Creates the lodge for `ownerId` as a free preview on the plan and design asked
 * for, with an address made from the name (or the one typed). `previewEndsAt`
 * null: no timer (a lead's site, until it's handed over). Returns its id.
 */
export async function createLodge(ownerId: string, input: NewLodge, { previewEndsAt, leadId = null }: { previewEndsAt: Date | null; leadId?: string | null }) {
  let slug = input.slug;
  if (slug) {
    const problem = slugProblem(slug);
    if (problem) throw new HTTPException(400, { message: problem });
    if (await slugTaken(slug)) throw new HTTPException(409, { message: "That address was just taken. Try another." });
  } else {
    // "Mist Valley Lodge" → mist-valley-lodge (or the nearest free one)
    const base = slugFromName(input.name);
    slug = (base.length >= 3 ? await freeSlug(base, input.town) : null) ?? (await freeSlug(`${base || "lodge"}-stay`, null)) ?? undefined;
    if (!slug) throw new HTTPException(409, { message: "Try a slightly different lodge name." });
  }

  const plan = input.plan as keyof typeof DEFAULT_TEMPLATE;
  if (input.template && !templateAllowed(findTemplate(input.template)!, plan)) {
    throw new HTTPException(400, { message: "That design needs a bigger plan." });
  }
  const lodge = await prisma.lodge.create({
    data: {
      slug,
      name: input.name,
      town: input.town,
      region: input.region,
      country: input.country ?? DEFAULT_COUNTRY,
      kind: input.kind ?? null,
      setting: input.setting ?? null,
      roomsHint: input.roomsHint ?? null,
      priceHint: input.priceHint ?? null,
      whatsapp: input.whatsapp,
      plan,
      template: input.template ?? DEFAULT_TEMPLATE[plan],
      status: "DEMO",
      demoEndsAt: previewEndsAt,
      founding: foundingOpen(new Date()),
      ownerId,
      leadId,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      signupReferrer: input.referrer,
    },
    select: { id: true },
  });
  return lodge.id;
}
