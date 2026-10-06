import prisma from "@stayzim/db";
import { addDays, DEFAULT_TEMPLATE, DEMO_DAYS, isPlan, slugFromName, slugProblem } from "@stayzim/sites";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { onDemoCreated } from "../lib/billing";
import { clientIp } from "../lib/ip";
import { lodgeJson, phoneNumber } from "../lib/lodge";
import { requireAuth, type AuthVariables } from "../lib/session";
import { validJson } from "../lib/validate";

const lodgeSchema = z.object({
  plan: z.string().refine(isPlan, "Pick a plan"),
  name: z.string().trim().min(2, "Add your lodge name").max(80, "Keep the name under 80 characters"),
  town: z.string().trim().min(2, "Add the town").max(60, "Town is too long (60 characters at most)"),
  region: z
    .string()
    .trim()
    .max(60, "Province is too long (60 characters at most)")
    .nullable()
    .optional()
    .transform((value) => value || null),
  whatsapp: phoneNumber("WhatsApp").refine((value) => value !== null, "Add the WhatsApp number guests should message"),
  slug: z.string().trim().toLowerCase(),
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
    // A real person makes one lodge; this only stops scripts
    rateLimiter({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-7", keyGenerator: clientIp }),
    validJson(lodgeSchema),
    async (c) => {
      const user = c.get("user")!;
      const input = c.req.valid("json");
      if (await prisma.lodge.findUnique({ where: { ownerId: user.id }, select: { id: true } })) {
        throw new HTTPException(409, { message: "You already have a lodge. Open your dashboard to edit it." });
      }
      const problem = slugProblem(input.slug);
      if (problem) throw new HTTPException(400, { message: problem });
      if (await slugTaken(input.slug)) throw new HTTPException(409, { message: "That address was just taken. Try another." });

      const plan = input.plan as keyof typeof DEFAULT_TEMPLATE;
      const lodge = await prisma.lodge.create({
        data: {
          slug: input.slug,
          name: input.name,
          town: input.town,
          region: input.region,
          whatsapp: input.whatsapp,
          plan,
          template: DEFAULT_TEMPLATE[plan],
          status: "DEMO",
          demoEndsAt: addDays(new Date(), DEMO_DAYS),
          ownerId: user.id,
        },
        select: { id: true },
      });
      await onDemoCreated(lodge.id);
      return c.json(await lodgeJson(lodge.id), 201);
    },
  );
