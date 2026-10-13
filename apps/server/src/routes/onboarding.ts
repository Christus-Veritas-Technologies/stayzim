import prisma from "@stayzim/db";
import { addDays, DEMO_DAYS, slugFromName, slugProblem } from "@stayzim/sites";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";

import { onDemoCreated, sendDemoWelcome } from "../lib/billing";
import { clientIp } from "../lib/ip";
import { lodgeJson } from "../lib/lodge";
import { createLodge, freeSlug, newLodgeSchema, slugTaken } from "../lib/new-lodge";
import { requireAuth, type AuthVariables } from "../lib/session";
import { validJson } from "../lib/validate";

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
    validJson(newLodgeSchema),
    async (c) => {
      const user = c.get("user")!;
      const input = c.req.valid("json");
      if (await prisma.lodge.findUnique({ where: { ownerId: user.id }, select: { id: true } })) {
        throw new HTTPException(409, { message: "You already have a lodge. Open your dashboard to edit it." });
      }
      const lodgeId = await createLodge(user.id, input, { previewEndsAt: addDays(new Date(), DEMO_DAYS) });
      await onDemoCreated(lodgeId);
      return c.json(await lodgeJson(lodgeId), 201);
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
