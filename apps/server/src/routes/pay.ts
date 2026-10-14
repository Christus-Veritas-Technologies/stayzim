import prisma from "@stayzim/db";
import { designFitsPlan, PLANS_LABEL } from "@stayzim/sites";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { channelName, refreshPayment, startPaynowPayment } from "../lib/billing";
import { clientIp } from "../lib/ip";
import { paymentLinkUrl } from "../lib/payment-links";
import { MOBILE_CHANNELS, paynowEnabled } from "../lib/paynow";
import { siteUrlFor } from "../lib/sites";
import { validJson } from "../lib/validate";
import { paynowPhone } from "./billing";

const payInput = z.object({
  channel: z.enum([...MOBILE_CHANNELS, "web"]),
  /** The mobile money number, for a phone prompt */
  phone: z.string().trim().max(30).optional(),
});

/** The link, or 404: the same answer for a wrong token as for one that never existed. */
async function linkByToken(token: string) {
  if (!/^[\w-]{16,64}$/.test(token)) throw new HTTPException(404, { message: "This payment link doesn't exist. Ask StayZim for a new one." });
  const link = await prisma.paymentLink.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      plan: true,
      months: true,
      amountCents: true,
      expiresAt: true,
      paidAt: true,
      lodge: { select: { id: true, name: true, slug: true, customDomain: true, whatsapp: true, plan: true, template: true, paidUntil: true } },
    },
  });
  if (!link) throw new HTTPException(404, { message: "This payment link doesn't exist. Ask StayZim for a new one." });
  return link;
}

type Link = Awaited<ReturnType<typeof linkByToken>>;

function linkState(link: Link) {
  if (link.paidAt) return "paid" as const;
  return link.expiresAt <= new Date() ? ("expired" as const) : ("open" as const);
}

/** What the pay page shows: the lodge, its address and the one amount. Nothing about its owner. */
function linkJson(link: Link) {
  const siteUrl = siteUrlFor(link.lodge);
  return {
    lodgeName: link.lodge.name,
    siteUrl,
    siteAddress: siteUrl.replace(/^https?:\/\//, ""),
    plan: link.plan,
    planName: PLANS_LABEL[link.plan],
    months: link.months,
    amountCents: link.amountCents,
    state: linkState(link),
    /** Once paid: live until then */
    paidUntil: link.paidAt ? link.lodge.paidUntil : null,
    /** To fill in the mobile money number: the lodge's own WhatsApp number, digits with 263 */
    phone: link.lodge.whatsapp,
    paynow: paynowEnabled,
  };
}

/** A payment as the pay page sees it. */
function paymentJson(payment: Awaited<ReturnType<typeof refreshPayment>>) {
  return {
    id: payment.id,
    reference: payment.reference,
    amountCents: payment.amountCents,
    channel: payment.channel,
    channelName: channelName(payment.channel),
    status: payment.status,
    receiptNumber: payment.receiptNumber,
  };
}

/**
 * /api/pay/:token: a payment link (stayzim.co.zw/pay/…), no sign-in. Shows the
 * lodge and the amount, starts a Paynow payment for exactly that, and says how
 * it's going. Made in the admin app (POST /api/admin/sites/:slug/payment-link).
 */
export const pay = new Hono()
  .get("/:token", async (c) => {
    const link = await linkByToken(c.req.param("token"));
    return c.json(linkJson(link));
  })

  .post(
    "/:token",
    rateLimiter({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: "draft-7", keyGenerator: clientIp }),
    validJson(payInput),
    async (c) => {
      const link = await linkByToken(c.req.param("token") ?? "");
      const state = linkState(link);
      if (state === "paid") throw new HTTPException(409, { message: "This is paid already. Thank you!" });
      if (state === "expired") throw new HTTPException(410, { message: "This payment link has expired. Ask StayZim for a new one." });
      if (!paynowEnabled) throw new HTTPException(503, { message: "Paying online isn't switched on yet. Message StayZim to pay another way." });
      // The site's plan changed since the link was made, to one its design doesn't fit
      if (!designFitsPlan(link.lodge.template, link.lodge.plan, link.plan)) {
        throw new HTTPException(409, { message: "This payment link is out of date. Ask StayZim for a new one." });
      }

      const input = c.req.valid("json");
      const phone = input.channel === "web" ? null : paynowPhone(input.phone ?? "");
      if (input.channel !== "web" && !phone) throw new HTTPException(400, { message: "Enter the mobile money number, like 077 123 4567." });

      const started = await startPaynowPayment({
        lodgeId: link.lodge.id,
        plan: link.plan,
        months: link.months,
        amountCents: link.amountCents,
        channel: input.channel,
        phone,
        paymentLinkId: link.id,
        returnUrl: (id) => `${paymentLinkUrl(link.token)}?payment=${id}`,
      });
      if (!started.ok) throw new HTTPException(502, { message: started.error });
      return c.json(
        { payment: paymentJson(started.payment), redirectUrl: started.redirectUrl, instructions: started.instructions, innbucksCode: started.innbucksCode },
        201,
      );
    },
  )

  /** How a payment through this link is going (checks with Paynow while it's pending). */
  .get("/:token/payments/:id", async (c) => {
    const link = await linkByToken(c.req.param("token"));
    const owned = await prisma.payment.findFirst({ where: { id: c.req.param("id"), paymentLinkId: link.id }, select: { id: true } });
    if (!owned) throw new HTTPException(404, { message: "No such payment" });
    const payment = await refreshPayment(owned.id);
    // Paid now: the link and the site's new date come with it
    return c.json({ payment: paymentJson(payment), link: linkJson(await linkByToken(link.token)) });
  });
