import prisma from "@stayzim/db";
import { addDays, DEFAULT_TEMPLATE, DEMO_DAYS, findTemplate, isPlan, slugFromName, slugProblem, TEMPLATE_KEYS, templateAllowed } from "@stayzim/sites";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { onDemoCreated, sendDemoWelcome } from "../lib/billing";
import { clientIp } from "../lib/ip";
import { lodgeJson, phoneNumber } from "../lib/lodge";
import { requireAuth, type AuthVariables } from "../lib/session";
import { validJson } from "../lib/validate";

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

const lodgeSchema = z.object({
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
  // Left out by /create: the address is made from the name
  slug: z.string().trim().toLowerCase().optional(),
  utmSource: source(100),
  utmMedium: source(100),
  utmCampaign: source(150),
  utmContent: source(150),
  referrer: source(500),
});

async function slugTaken(slug: string) {
  return (await prisma.lodge.count({ where: { slug } })) > 0;
}

/**
 * A free address close to the one asked for: "mist-valley", then
 * "mist-valley-nyanga", then "mist-valley-2", "-3"…
 */
async function freeSlug(base: string, town: string | null) {
  if (!slugProblem(base) && !(await slugTaken(base))) return base;
  const candidates = [town ? slugFromName(`${base} ${town}`) : null, ...Array.from({ length: 20 }, (_, index) => `${base}-${index + 2}`)];
  for (const candidate of candidates) {
    if (candidate && !slugProblem(candidate) && !(await slugTaken(candidate))) return candidate;
  }
  return null;
}

/**
 * /api/onboarding: the start screen (/start) after sign-up. A signed-in owner
 * with no lodge yet makes one here; it goes live straight away as a 2-day demo.
 */
export const onboarding = new Hono<{ Variables: AuthVariables }>()
  .use(requireAuth())

  /**
   * The web address for a lodge name, or whether the one typed is free:
   * { slug, available, problem }. `problem` explains why one can't be used.
   */
  .get("/slug", async (c) => {
    const typed = c.req.query("slug")?.trim().toLowerCase();
    if (typed) {
      const problem = slugProblem(typed) ?? ((await slugTaken(typed)) ? "That address is taken. Try another." : null);
      return c.json({ slug: typed, available: problem === null, problem });
    }
    const base = slugFromName(c.req.query("name") ?? "");
    if (base.length < 3) return c.json({ slug: base, available: false, problem: null });
    const slug = await freeSlug(base, c.req.query("town")?.trim() || null);
    return c.json({ slug: slug ?? base, available: slug !== null, problem: slug ? null : "Try a different name." });
  })

  /** Creates the owner's lodge as a demo: live now, offline in DEMO_DAYS unless paid for. */
  .post(
    "/lodge",
    // A real person makes one lodge; this only stops scripts. Generous, because many
    // phones on one mobile network share an IP address (carrier NAT).
    rateLimiter({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", keyGenerator: clientIp }),
    validJson(lodgeSchema),
    async (c) => {
      const user = c.get("user")!;
      const input = c.req.valid("json");
      if (await prisma.lodge.findUnique({ where: { ownerId: user.id }, select: { id: true } })) {
        throw new HTTPException(409, { message: "You already have a lodge. Open your dashboard to edit it." });
      }
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
          whatsapp: input.whatsapp,
          plan,
          template: input.template ?? DEFAULT_TEMPLATE[plan],
          status: "DEMO",
          demoEndsAt: addDays(new Date(), DEMO_DAYS),
          ownerId: user.id,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmContent: input.utmContent,
          signupReferrer: input.referrer,
        },
        select: { id: true },
      });
      await onDemoCreated(lodge.id);
      return c.json(await lodgeJson(lodge.id), 201);
    },
  )

  /** After "Claim my site": the welcome email goes to the address they just gave. */
  .post(
    "/claimed",
    rateLimiter({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", keyGenerator: clientIp }),
    async (c) => {
      const user = c.get("user")!;
      if (user.isAnonymous) throw new HTTPException(400, { message: "Add your email first." });
      const lodge = await prisma.lodge.findUnique({ where: { ownerId: user.id }, select: { id: true } });
      if (lodge) await sendDemoWelcome(lodge.id);
      return c.body(null, 204);
    },
  );
