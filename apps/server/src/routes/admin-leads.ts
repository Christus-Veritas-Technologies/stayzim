import { auth, claimTokenHash, newClaimToken } from "@stayzim/auth";
import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { GUEST_EMAIL_DOMAIN } from "@stayzim/mail";
import { addDays, monthlyPrice, PLAN_PRICES } from "@stayzim/sites";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { deleteLodge, requireAdmin } from "../lib/admin";
import type { LodgeVariables } from "../lib/lodge";
import { createLodge, newLodgeSchema } from "../lib/new-lodge";
import { requireAuth, withSession } from "../lib/session";
import { paymentLinkJson, paymentLinkSelect } from "../lib/payment-links";
import { siteUrlFor } from "../lib/sites";
import { validJson } from "../lib/validate";
import { photos } from "./photos";

/**
 * /api/admin/leads (the admin app): leads (the outreach contacts), the sites the
 * team makes for them, their photos, and the claim link that hands one over.
 * Sending WhatsApp messages is the admin app's own (/api/outreach there).
 */

const WEB_URL = (env.WEB_URL ?? env.CORS_ORIGIN[0]!).replace(/\/$/, "");
/** How long a claim link works */
const CLAIM_LINK_DAYS = 7;
const PAGE_SIZE = 50;

/** "+263 77 123 4567", "0771234567" → "263771234567"; null if it isn't a phone number. */
export function leadPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("2630")) digits = `263${digits.slice(4)}`;
  else if (/^0\d{9}$/.test(digits)) digits = `263${digits.slice(1)}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

const leadInput = z.object({
  name: z.string().trim().min(1, "Add their name").max(200),
  phone: z.string().trim().min(1, "Add their WhatsApp number").max(30),
  city: z.string().trim().min(1, "Add their town or city").max(100),
  lodgeName: text(120),
  email: z.email("Check the email").nullable().optional().or(z.literal("").transform(() => null)),
  notes: z.string().trim().max(4000).optional(),
  source: z.enum(["meta_form", "list", "manual"]).default("manual"),
});

const leadUpdate = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    lodgeName: text(120),
    email: z.email("Check the email").nullable().optional().or(z.literal("").transform(() => null)),
    notes: z.string().trim().max(4000).optional(),
    /** Do not contact, or back to Pending */
    status: z.enum(["PENDING", "DO_NOT_CONTACT"]).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Nothing to change");

const importInput = z.object({
  source: z.enum(["meta_form", "list", "manual"]).default("meta_form"),
  leads: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        phone: z.string().trim().min(1).max(30),
        city: z.string().trim().max(100).default(""),
        email: z.string().trim().max(200).optional(),
        lodgeName: z.string().trim().max(120).optional(),
      }),
    )
    .min(1)
    .max(2000),
});

const leadListQuery = z.object({
  q: z.string().trim().max(80).default(""),
  status: z.enum(["all", "PENDING", "REACHED", "REPLIED", "NOT_ON_WHATSAPP", "FAILED", "DO_NOT_CONTACT"]).default("all"),
  source: z.enum(["all", "meta_form", "list", "manual"]).default("all"),
  /** Only leads with sites made for them */
  withSites: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** A site made for a lead, as the lead screen lists it. */
const leadSiteSelect = {
  id: true,
  name: true,
  slug: true,
  customDomain: true,
  plan: true,
  template: true,
  founding: true,
  status: true,
  demoEndsAt: true,
  createdAt: true,
  claimTokenExpiresAt: true,
  paymentLinks: { orderBy: { createdAt: "desc" }, take: 1, select: paymentLinkSelect },
  owner: { select: { isAnonymous: true, email: true, name: true } },
  _count: { select: { photos: true, rooms: true } },
} as const;

type LeadSite = Awaited<ReturnType<typeof prisma.lodge.findMany<{ select: typeof leadSiteSelect }>>>[number];

function leadSiteJson(site: LeadSite) {
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    url: siteUrlFor(site),
    plan: site.plan,
    template: site.template,
    founding: site.founding,
    monthlyPrice: monthlyPrice(site.plan, site.founding),
    normalPrice: PLAN_PRICES[site.plan],
    status: site.status,
    previewEndsAt: site.demoEndsAt,
    createdAt: site.createdAt,
    /** Claimed: the lead has it, with their own login */
    claimed: !site.owner.isAnonymous,
    ownerEmail: site.owner.isAnonymous ? null : site.owner.email,
    claimLinkExpiresAt: site.claimTokenExpiresAt,
    paymentLink: site.paymentLinks[0] ? paymentLinkJson(site.paymentLinks[0]) : null,
    photos: site._count.photos,
  };
}

async function leadById(id: string) {
  const lead = await prisma.contact.findUnique({ where: { id }, select: { id: true, name: true, phone: true } });
  if (!lead) throw new HTTPException(404, { message: "No such lead" });
  return lead;
}

async function leadDetail(id: string) {
  const lead = await prisma.contact.findUniqueOrThrow({
    where: { id },
    include: {
      sites: { orderBy: { createdAt: "asc" }, select: leadSiteSelect },
      messages: { orderBy: { createdAt: "desc" }, take: 100 },
      replies: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  // Replies stored before they were tied to the contact still match on the number
  const loose = await prisma.inboundMessage.findMany({ where: { contactId: null, phone: lead.phone }, orderBy: { createdAt: "desc" }, take: 50 });
  const conversation = [
    ...lead.messages.map((message) => ({ id: message.id, direction: "out" as const, body: message.body, account: message.account, status: message.status, error: message.error, at: message.createdAt })),
    ...[...lead.replies, ...loose].map((reply) => ({ id: reply.id, direction: "in" as const, body: reply.body, account: reply.account, status: null, error: null, type: reply.type, at: reply.createdAt })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const { sites, messages: _messages, replies: _replies, ...contact } = lead;
  return { ...contact, sites: sites.map(leadSiteJson), conversation };
}

/** For the photo routes below: the site by its slug, as `lodgeId`. */
const siteFromSlug = createMiddleware<{ Variables: LodgeVariables }>(async (c, next) => {
  const lodge = await prisma.lodge.findUnique({ where: { slug: (c.req.param("slug") ?? "").toLowerCase() }, select: { id: true } });
  if (!lodge) throw new HTTPException(404, { message: "No site with that address" });
  c.set("lodgeId", lodge.id);
  await next();
});

export const adminLeads = new Hono<{ Variables: LodgeVariables }>()
  .use(withSession, requireAuth(), requireAdmin)

  .get("/leads", async (c) => {
    const query = leadListQuery.safeParse(c.req.query());
    if (!query.success) throw new HTTPException(400, { message: "Check the filters" });
    const { q, status, source, withSites, page } = query.data;
    const digits = q.replace(/\D/g, "");
    const where = {
      ...(status !== "all" && { status }),
      ...(source !== "all" && { source }),
      ...(withSites === "true" && { sites: { some: {} } }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { lodgeName: { contains: q, mode: "insensitive" as const } },
          { city: { contains: q, mode: "insensitive" as const } },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      }),
    };
    const [total, leads] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: [{ lastRepliedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          sites: { select: { slug: true, plan: true, owner: { select: { isAnonymous: true } } } },
          replies: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
        },
      }),
    ]);
    return c.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      leads: leads.map(({ sites, replies, ...lead }) => ({
        ...lead,
        sites: sites.map((site) => ({ slug: site.slug, plan: site.plan, claimed: !site.owner.isAnonymous })),
        lastReply: replies[0] ?? null,
      })),
    });
  })

  .post("/leads", validJson(leadInput), async (c) => {
    const input = c.req.valid("json");
    const phone = leadPhone(input.phone);
    if (!phone) throw new HTTPException(400, { message: "Check the number: include the country code, like +263 77 123 4567" });
    if (await prisma.contact.findUnique({ where: { phone }, select: { id: true } })) {
      throw new HTTPException(409, { message: "There's a lead with that number already" });
    }
    const lead = await prisma.contact.create({
      data: { name: input.name, phone, city: input.city, lodgeName: input.lodgeName, email: input.email ?? null, notes: input.notes ?? "", source: input.source },
      select: { id: true },
    });
    return c.json(await leadDetail(lead.id), 201);
  })

  /**
   * The Facebook form's CSV (parsed in the browser): new numbers become leads;
   * a number already there gets the email, lodge name and source it was missing.
   */
  .post("/leads/import", validJson(importInput), async (c) => {
    const { leads, source } = c.req.valid("json");
    let created = 0;
    let updated = 0;
    const skipped: { name: string; phone: string; reason: string }[] = [];
    const seen = new Set<string>();
    for (const row of leads) {
      const phone = leadPhone(row.phone);
      if (!phone) {
        skipped.push({ name: row.name, phone: row.phone, reason: "not a phone number" });
        continue;
      }
      if (seen.has(phone)) continue;
      seen.add(phone);
      const email = row.email && z.email().safeParse(row.email).success ? row.email : null;
      const existing = await prisma.contact.findUnique({ where: { phone }, select: { id: true, email: true, lodgeName: true, source: true } });
      if (existing) {
        const data = {
          ...(!existing.email && email ? { email } : {}),
          ...(!existing.lodgeName && row.lodgeName ? { lodgeName: row.lodgeName } : {}),
          ...(!existing.source ? { source } : {}),
        };
        if (Object.keys(data).length > 0) {
          await prisma.contact.update({ where: { id: existing.id }, data });
          updated += 1;
        }
        continue;
      }
      await prisma.contact.create({ data: { name: row.name, phone, city: row.city || "Unknown", email, lodgeName: row.lodgeName || null, source } });
      created += 1;
    }
    return c.json({ received: leads.length, created, updated, skipped });
  })

  .get("/leads/:id", async (c) => {
    const lead = await leadById(c.req.param("id"));
    return c.json(await leadDetail(lead.id));
  })

  .patch("/leads/:id", validJson(leadUpdate), async (c) => {
    const lead = await leadById(c.req.param("id"));
    const { email, ...input } = c.req.valid("json");
    await prisma.contact.update({ where: { id: lead.id }, data: { ...input, ...(email !== undefined ? { email } : {}) } });
    return c.json(await leadDetail(lead.id));
  })

  /** A lead with no sites left; their messages stay in the log. */
  .delete("/leads/:id", async (c) => {
    const lead = await leadById(c.req.param("id"));
    const sites = await prisma.lodge.count({ where: { leadId: lead.id, owner: { isAnonymous: true } } });
    if (sites > 0) throw new HTTPException(409, { message: "Delete the sites made for this lead first" });
    await prisma.contact.delete({ where: { id: lead.id } });
    return c.body(null, 204);
  })

  /**
   * Makes a site for the lead: the /create steps on their behalf. It belongs to a
   * placeholder guest account until handed over, with no timer on its preview.
   */
  .post("/leads/:id/sites", validJson(newLodgeSchema), async (c) => {
    const lead = await leadById(c.req.param("id"));
    const input = c.req.valid("json");
    const ctx = await auth.$context;
    const placeholder = await ctx.internalAdapter.createUser(
      { email: `lead-${crypto.randomUUID()}@${GUEST_EMAIL_DOMAIN}`, emailVerified: false, name: lead.name, isAnonymous: true },
      { method: "admin" },
    );
    try {
      const lodgeId = await createLodge(placeholder.id, input, { previewEndsAt: null, leadId: lead.id });
      const site = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: leadSiteSelect });
      return c.json(leadSiteJson(site), 201);
    } catch (error) {
      await prisma.user.delete({ where: { id: placeholder.id } }).catch(() => {});
      throw error;
    }
  })

  /** Deletes a site made for a lead that they haven't taken. */
  .delete("/leads/:id/sites/:slug", async (c) => {
    const lead = await leadById(c.req.param("id"));
    const site = await prisma.lodge.findFirst({ where: { slug: c.req.param("slug"), leadId: lead.id }, select: { id: true, owner: { select: { isAnonymous: true } } } });
    if (!site) throw new HTTPException(404, { message: "No such site for this lead" });
    if (!site.owner.isAnonymous) throw new HTTPException(409, { message: "The lead has taken this site; it's theirs now" });
    await deleteLodge(site.id);
    return c.json(await leadDetail(lead.id));
  })

  /** "Give to lead": a new one-time claim link (any older one stops working). */
  .post("/leads/:id/sites/:slug/claim-link", async (c) => {
    const lead = await leadById(c.req.param("id"));
    const site = await prisma.lodge.findFirst({ where: { slug: c.req.param("slug"), leadId: lead.id }, select: { id: true, owner: { select: { isAnonymous: true } } } });
    if (!site) throw new HTTPException(404, { message: "No such site for this lead" });
    if (!site.owner.isAnonymous) throw new HTTPException(409, { message: "The lead has taken this site already" });
    const token = newClaimToken();
    const expiresAt = addDays(new Date(), CLAIM_LINK_DAYS);
    await prisma.lodge.update({ where: { id: site.id }, data: { claimTokenHash: await claimTokenHash(token), claimTokenExpiresAt: expiresAt } });
    return c.json({ url: `${WEB_URL}/claim/${token}`, expiresAt }, 201);
  })

  // A site's photos, as the owner's dashboard has them (upload, caption, order, delete)
  .use("/sites/:slug/photos/*", siteFromSlug)
  .use("/sites/:slug/photos", siteFromSlug)
  .route("/sites/:slug/photos", photos);
