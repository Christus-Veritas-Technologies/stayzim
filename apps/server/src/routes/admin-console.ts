import { auth } from "@stayzim/auth";
import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { addDays, demoEnded, isPlan, monthlyPrice, normalizeDomain, PAY_MONTHS, PLAN_PRICES, type Plan } from "@stayzim/sites";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { deleteLodge, requireAdmin, withTeamSession } from "../lib/admin";
import { recordManualPayment } from "../lib/billing";
import { createPaymentLink, latestPaymentLink } from "../lib/payment-links";
import { leadPhone } from "./admin-leads";
import { requireAuth, type AuthVariables } from "../lib/session";
import { siteUrlFor } from "../lib/sites";
import { uploadUrl } from "../lib/uploads";
import { validJson } from "../lib/validate";

/**
 * /api/admin (the admin app, apps/admin): the overview, users, sites with their
 * billing and status, billing across lodges, and free domains waiting.
 * Team accounts only.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEB_URL = (env.WEB_URL ?? env.CORS_ORIGIN[0]!).replace(/\/$/, "");

/** "meta · registration_test", the referring site's host, or null. */
function sourceLabel(lodge: { utmSource: string | null; utmCampaign: string | null; signupReferrer: string | null; leadId?: string | null }) {
  if (lodge.utmSource) return [lodge.utmSource, lodge.utmCampaign].filter(Boolean).join(" · ");
  if (lodge.signupReferrer) return URL.parse(lodge.signupReferrer)?.hostname ?? null;
  return lodge.leadId ? "made by the team" : null;
}

/** What a site's status means right now: a preview that ran out is "ended", not "live". */
type SiteState = "PREVIEW" | "PREVIEW_ENDED" | "ACTIVE" | "OVERDUE" | "SUSPENDED";
function siteState(lodge: { status: "DEMO" | "ACTIVE" | "OVERDUE" | "SUSPENDED"; demoEndsAt: Date | null }, now: Date): SiteState {
  if (lodge.status === "DEMO") return demoEnded(lodge, now) ? "PREVIEW_ENDED" : "PREVIEW";
  return lodge.status;
}

const siteListSelect = {
  id: true,
  name: true,
  slug: true,
  customDomain: true,
  town: true,
  plan: true,
  status: true,
  demoEndsAt: true,
  paidUntil: true,
  founding: true,
  template: true,
  createdAt: true,
  utmSource: true,
  utmCampaign: true,
  signupReferrer: true,
  leadId: true,
  lead: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, email: true, isAnonymous: true, role: true } },
  _count: { select: { rooms: true, photos: true } },
} as const;

type SiteRow = Awaited<ReturnType<typeof prisma.lodge.findMany<{ select: typeof siteListSelect }>>>[number];

function siteRowJson(lodge: SiteRow, now: Date) {
  return {
    id: lodge.id,
    name: lodge.name,
    slug: lodge.slug,
    url: siteUrlFor(lodge),
    town: lodge.town,
    plan: lodge.plan,
    status: lodge.status,
    state: siteState(lodge, now),
    previewEndsAt: lodge.demoEndsAt,
    paidUntil: lodge.paidUntil,
    founding: lodge.founding,
    monthlyPrice: monthlyPrice(lodge.plan, lodge.founding),
    template: lodge.template,
    createdAt: lodge.createdAt,
    source: sourceLabel(lodge),
    lead: lodge.lead,
    owner: { id: lodge.owner.id, name: lodge.owner.name, email: lodge.owner.isAnonymous ? null : lodge.owner.email, guest: lodge.owner.isAnonymous, team: lodge.owner.role === "ADMIN" },
    rooms: lodge._count.rooms,
    photos: lodge._count.photos,
  };
}

const siteListQuery = z.object({
  q: z.string().trim().max(80).default(""),
  state: z.enum(["all", "PREVIEW", "PREVIEW_ENDED", "ACTIVE", "OVERDUE", "SUSPENDED"]).default("all"),
  plan: z.enum(["all", "STARTER", "GROWTH", "PRO"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});
const PAGE_SIZE = 50;

const userListQuery = z.object({
  q: z.string().trim().max(80).default(""),
  kind: z.enum(["all", "owners", "guests", "team"]).default("owners"),
  page: z.coerce.number().int().min(1).default(1),
});

const siteUpdate = z
  .object({
    /** Push the free preview's end out by this many days (from now, or from its end if that's later) */
    extendPreviewDays: z.number().int().min(1).max(60).optional(),
    status: z.enum(["ACTIVE", "OVERDUE", "SUSPENDED"]).optional(),
    founding: z.boolean().optional(),
    /** A domain to answer on, or null to remove it */
    customDomain: z.string().trim().max(253).nullable().optional(),
    /** The lodge's details, as its owner edits them on the dashboard */
    name: z.string().trim().min(2, "Add the lodge's name").max(80).optional(),
    town: z.string().trim().max(60).nullable().optional(),
    whatsapp: z.string().trim().max(30).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Nothing to change");

const paymentInput = z.object({
  plan: z.string().refine(isPlan, "Pick a plan"),
  months: z.number().int().refine((value) => (PAY_MONTHS as readonly number[]).includes(value), "1, 3 or 12 months"),
  /** Dollars; left out: the lodge's own price for those months */
  amount: z.number().positive().max(10_000).optional(),
  channel: z.enum(["ecocash", "innbucks", "onemoney", "paynow", "cash", "bank"]),
  note: z.string().trim().max(300).optional(),
});

async function siteBySlug(slug: string) {
  const lodge = await prisma.lodge.findUnique({ where: { slug: slug.toLowerCase() }, select: { id: true } });
  if (!lodge) throw new HTTPException(404, { message: "No site with that address" });
  return lodge.id;
}

/** Everything the site screen shows. */
async function siteDetail(lodgeId: string) {
  const now = new Date();
  const lodge = await prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    select: {
      ...siteListSelect,
      whatsapp: true,
      email: true,
      region: true,
      country: true,
      kind: true,
      setting: true,
      utmMedium: true,
      utmContent: true,
      linkSharedAt: true,
      claimTokenExpiresAt: true,
      heroPhoto: { select: { key: true } },
      photos: { where: { roomId: null }, orderBy: { position: "asc" }, take: 1, select: { key: true } },
      domainClaim: { select: { domain: true, status: true, createdAt: true, readyAt: true } },
      invoices: { orderBy: { dueAt: "desc" }, take: 20, select: { id: true, number: true, plan: true, amountCents: true, status: true, dueAt: true, periodStart: true, periodEnd: true, paidAt: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, reference: true, receiptNumber: true, plan: true, months: true, amountCents: true, method: true, channel: true, status: true, paidAt: true, createdAt: true, note: true },
      },
      requests: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, reference: true, topic: true, message: true, status: true, createdAt: true } },
      _count: { select: { rooms: true, photos: true, bookings: true, events: true, reviews: true, posts: true } },
    },
  });
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const visits30 = await prisma.siteEvent.count({ where: { lodgeId, type: "PAGE_VIEW", createdAt: { gte: since30 } } });
  const hero = lodge.heroPhoto ?? lodge.photos[0] ?? null;
  return {
    ...siteRowJson(lodge, now),
    whatsapp: lodge.whatsapp,
    email: lodge.email,
    place: [lodge.town, lodge.region, lodge.country].filter(Boolean).join(", "),
    kind: lodge.kind,
    setting: lodge.setting,
    customDomain: lodge.customDomain,
    heroUrl: hero ? uploadUrl(hero.key) : null,
    normalPrice: PLAN_PRICES[lodge.plan],
    utm: { source: lodge.utmSource, medium: lodge.utmMedium, campaign: lodge.utmCampaign, content: lodge.utmContent, referrer: lodge.signupReferrer },
    linkSharedAt: lodge.linkSharedAt,
    claimLinkExpiresAt: lodge.claimTokenExpiresAt,
    paymentLink: await latestPaymentLink(lodgeId),
    domainClaim: lodge.domainClaim,
    invoices: lodge.invoices,
    payments: lodge.payments,
    requests: lodge.requests,
    counts: { rooms: lodge._count.rooms, photos: lodge._count.photos, bookings: lodge._count.bookings, reviews: lodge._count.reviews, posts: lodge._count.posts, visits30 },
  };
}

export const adminConsole = new Hono<{ Variables: AuthVariables }>()
  .use(withTeamSession, requireAuth(), requireAdmin)

  /** The overview: sign-ups, sites by status, money, sources, the /create funnel and the latest activity. */
  .get("/overview", async (c) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(-2, 0, 0, 0); // midnight in Harare (UTC+2)
    if (startOfDay > now) startOfDay.setTime(startOfDay.getTime() - DAY_MS);
    const week = new Date(now.getTime() - 7 * DAY_MS);
    const month = new Date(now.getTime() - 30 * DAY_MS);
    // Sign-ups are sites people made themselves: not the team's sites for leads, not the team's own
    const selfMade = { leadId: null, owner: { role: "OWNER" as const } };

    const [today, thisWeek, thisMonth, owners, guests, team, lodges, paid30, pending, sources, funnelRows, recentSites, recentPayments, leads] = await Promise.all([
      prisma.lodge.count({ where: { ...selfMade, createdAt: { gte: startOfDay } } }),
      prisma.lodge.count({ where: { ...selfMade, createdAt: { gte: week } } }),
      prisma.lodge.count({ where: { ...selfMade, createdAt: { gte: month } } }),
      prisma.user.count({ where: { role: "OWNER", isAnonymous: false } }),
      prisma.user.count({ where: { role: "OWNER", isAnonymous: true, lodge: { leadId: null } } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.lodge.findMany({ select: { status: true, demoEndsAt: true, plan: true, founding: true, leadId: true, owner: { select: { isAnonymous: true } } } }),
      prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: month } }, _sum: { amountCents: true }, _count: true }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.lodge.groupBy({ by: ["utmSource"], where: { ...selfMade, createdAt: { gte: month } }, _count: true }),
      prisma.landingEvent.groupBy({ by: ["cta", "visitorId"], where: { type: "CTA_CLICK", section: "create", createdAt: { gte: month } } }),
      prisma.lodge.findMany({ where: { owner: { role: "OWNER" } }, orderBy: { createdAt: "desc" }, take: 8, select: siteListSelect }),
      prisma.payment.findMany({
        where: { status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 8,
        select: { id: true, amountCents: true, plan: true, months: true, channel: true, paidAt: true, lodge: { select: { name: true, slug: true } } },
      }),
      prisma.contact.count(),
    ]);

    const states: Record<SiteState, number> = { PREVIEW: 0, PREVIEW_ENDED: 0, ACTIVE: 0, OVERDUE: 0, SUSPENDED: 0 };
    let mrrDollars = 0;
    let founding = 0;
    let leadSites = 0;
    for (const lodge of lodges) {
      if (lodge.leadId && lodge.owner.isAnonymous) {
        leadSites += 1;
        continue;
      }
      states[siteState(lodge, now)] += 1;
      if (lodge.founding) founding += 1;
      if (lodge.status === "ACTIVE" || lodge.status === "OVERDUE") mrrDollars += monthlyPrice(lodge.plan, lodge.founding);
    }

    const steps = ["open", "look", "place", "lodge", "photo", "live", "claim"];
    const funnel = steps.map((step) => ({ step, visitors: funnelRows.filter((row) => row.cta === `create_${step}`).length }));

    return c.json({
      signups: { today, week: thisWeek, month: thisMonth },
      users: { owners, guests, team },
      sites: { ...states, founding, leadSites },
      money: { mrrCents: mrrDollars * 100, paid30Cents: paid30._sum.amountCents ?? 0, paid30Count: paid30._count, pending },
      sources: sources.map((row) => ({ source: row.utmSource ?? "direct", sites: row._count })).sort((a, b) => b.sites - a.sites),
      funnel,
      leads,
      recentSites: recentSites.map((lodge) => siteRowJson(lodge, now)),
      recentPayments: recentPayments.map(({ lodge, ...payment }) => ({ ...payment, lodge })),
    });
  })

  /** Everyone with an account: owners (claimed), guests (from /create, not claimed yet) or the team. */
  .get("/users", async (c) => {
    const query = userListQuery.safeParse(c.req.query());
    if (!query.success) throw new HTTPException(400, { message: "Check the filters" });
    const { q, kind, page } = query.data;
    const where = {
      ...(kind === "owners" && { role: "OWNER" as const, isAnonymous: false }),
      // Guests who started at /create; the placeholders on sites made for leads are on the lead
      ...(kind === "guests" && { role: "OWNER" as const, isAnonymous: true, lodge: { leadId: null } }),
      ...(kind === "team" && { role: "ADMIN" as const }),
      ...(kind === "all" && { NOT: { isAnonymous: true, lodge: { leadId: { not: null } } } }),
      ...(q && { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }),
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAnonymous: true,
          createdAt: true,
          sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
          accounts: { select: { providerId: true } },
          lodge: { select: { name: true, slug: true, plan: true, status: true, demoEndsAt: true } },
        },
      }),
    ]);
    const now = new Date();
    return c.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.isAnonymous ? null : user.email,
        role: user.role,
        guest: user.isAnonymous,
        createdAt: user.createdAt,
        lastSeenAt: user.sessions[0]?.updatedAt ?? null,
        signIn: user.accounts.map((account) => account.providerId),
        lodge: user.lodge ? { name: user.lodge.name, slug: user.lodge.slug, plan: user.lodge.plan, state: siteState(user.lodge, now) } : null,
      })),
    });
  })

  /** Sends the user the same password reset email as Forgot password. */
  .post("/users/:id/password-reset", async (c) => {
    const user = await prisma.user.findUnique({ where: { id: c.req.param("id") }, select: { email: true, isAnonymous: true } });
    if (!user) throw new HTTPException(404, { message: "No such user" });
    if (user.isAnonymous) throw new HTTPException(400, { message: "This guest hasn't added an email yet." });
    await auth.api.requestPasswordReset({ body: { email: user.email, redirectTo: `${WEB_URL}/reset-password` } });
    return c.body(null, 204);
  })

  /** Every site, newest first, with filters. */
  .get("/sites", async (c) => {
    const query = siteListQuery.safeParse(c.req.query());
    if (!query.success) throw new HTTPException(400, { message: "Check the filters" });
    const { q, state, plan, page } = query.data;
    const now = new Date();
    const stateWhere =
      state === "PREVIEW"
        ? { status: "DEMO" as const, OR: [{ demoEndsAt: null }, { demoEndsAt: { gt: now } }] }
        : state === "PREVIEW_ENDED"
          ? { status: "DEMO" as const, demoEndsAt: { lte: now } }
          : state === "all"
            ? {}
            : { status: state };
    const where = {
      ...stateWhere,
      ...(plan !== "all" && { plan }),
      ...(q && {
        AND: [
          {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q.toLowerCase() } },
              { customDomain: { contains: q.toLowerCase() } },
              { owner: { email: { contains: q, mode: "insensitive" as const } } },
            ],
          },
        ],
      }),
    };
    const [total, sites] = await Promise.all([
      prisma.lodge.count({ where }),
      prisma.lodge.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: siteListSelect }),
    ]);
    return c.json({ total, page, pageSize: PAGE_SIZE, sites: sites.map((lodge) => siteRowJson(lodge, now)) });
  })

  .get("/sites/:slug", async (c) => c.json(await siteDetail(await siteBySlug(c.req.param("slug")))))

  /** Extend the free preview, set the status, founding price on or off, its own domain. */
  .patch("/sites/:slug", validJson(siteUpdate), async (c) => {
    const lodgeId = await siteBySlug(c.req.param("slug"));
    const input = c.req.valid("json");
    const lodge = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { status: true, demoEndsAt: true } });
    const data: { demoEndsAt?: Date; status?: "ACTIVE" | "OVERDUE" | "SUSPENDED"; founding?: boolean; customDomain?: string | null; name?: string; town?: string | null; whatsapp?: string } = {};

    if (input.name) data.name = input.name;
    if (input.town !== undefined) data.town = input.town || null;
    if (input.whatsapp !== undefined) {
      const whatsapp = leadPhone(input.whatsapp);
      if (!whatsapp) throw new HTTPException(400, { message: "Check the WhatsApp number: include the country code, like +263 77 123 4567" });
      data.whatsapp = whatsapp;
    }

    if (input.extendPreviewDays) {
      if (lodge.status !== "DEMO") throw new HTTPException(400, { message: "Only a free preview has an end to move." });
      const now = new Date();
      const from = lodge.demoEndsAt && lodge.demoEndsAt > now ? lodge.demoEndsAt : now;
      data.demoEndsAt = addDays(from, input.extendPreviewDays);
    }
    if (input.status) data.status = input.status;
    if (input.founding !== undefined) data.founding = input.founding;
    if (input.customDomain !== undefined) {
      if (input.customDomain === null || input.customDomain === "") data.customDomain = null;
      else {
        const domain = normalizeDomain(input.customDomain);
        const sitesDomain = env.SITES_DOMAIN.replace(/:\d+$/, "");
        if (!domain) throw new HTTPException(400, { message: "Type the domain name, like mistvalleylodge.co.zw" });
        if (domain === sitesDomain || domain.endsWith(`.${sitesDomain}`)) throw new HTTPException(400, { message: `Every site has a ${sitesDomain} address already` });
        const taken = await prisma.lodge.findUnique({ where: { customDomain: domain }, select: { id: true, slug: true } });
        if (taken && taken.id !== lodgeId) throw new HTTPException(409, { message: `${domain} already belongs to ${taken.slug}` });
        data.customDomain = domain;
      }
    }
    await prisma.lodge.update({ where: { id: lodgeId }, data });
    return c.json(await siteDetail(lodgeId));
  })

  /** A payment made outside the app (what mark-paid does): the site goes live on that plan, and the receipt is emailed. */
  .post("/sites/:slug/payments", validJson(paymentInput), async (c) => {
    const lodgeId = await siteBySlug(c.req.param("slug"));
    const input = c.req.valid("json");
    const owner = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { owner: { select: { isAnonymous: true } } } });
    if (owner.owner.isAnonymous) throw new HTTPException(400, { message: "Hand the site over first: its owner hasn't added an email for the receipt." });
    await recordManualPayment({
      lodgeId,
      plan: input.plan as Plan,
      months: input.months,
      amountCents: input.amount ? Math.round(input.amount * 100) : undefined,
      channel: input.channel,
      note: input.note || "Recorded in the admin app",
    });
    return c.json(await siteDetail(lodgeId), 201);
  })

  /**
   * A payment link for this site: its own plan for 1, 3 or 12 months at its
   * price, paid without signing in (stayzim.co.zw/pay/…). Its earlier unpaid
   * links stop working.
   */
  .post("/sites/:slug/payment-link", validJson(z.object({ months: paymentInput.shape.months })), async (c) => {
    const lodgeId = await siteBySlug(c.req.param("slug"));
    const link = await createPaymentLink(lodgeId, c.req.valid("json").months, c.get("user")?.id ?? null);
    return c.json(link, 201);
  })

  /** Deletes a site that never paid, with its photos and its account (unless it's the team's). */
  .delete("/sites/:slug", async (c) => {
    const lodgeId = await siteBySlug(c.req.param("slug"));
    const paid = await prisma.payment.count({ where: { lodgeId, status: "PAID" } });
    if (paid > 0) throw new HTTPException(409, { message: "This site has been paid for. Set it offline instead." });
    await deleteLodge(lodgeId);
    return c.body(null, 204);
  })

  /** Invoices and payments across every lodge, newest first. */
  .get("/billing", async (c) => {
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, number: true, plan: true, amountCents: true, status: true, dueAt: true, paidAt: true, lodge: { select: { name: true, slug: true } } },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          reference: true,
          receiptNumber: true,
          plan: true,
          months: true,
          amountCents: true,
          method: true,
          channel: true,
          status: true,
          paidAt: true,
          createdAt: true,
          lodge: { select: { name: true, slug: true } },
        },
      }),
    ]);
    return c.json({ invoices, payments });
  })

  /** Free .co.zw domains claimed and waiting to be set up, oldest first. */
  .get("/domains", async (c) => {
    const claims = await prisma.domainClaim.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: {
        id: true,
        domain: true,
        status: true,
        createdAt: true,
        readyAt: true,
        lodge: { select: { name: true, slug: true, customDomain: true, plan: true, whatsapp: true, owner: { select: { name: true, email: true } } } },
      },
    });
    return c.json({ claims });
  });
