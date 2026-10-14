import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { planPriceCents, type Plan } from "@stayzim/sites";

/**
 * Payment links (stayzim.co.zw/pay/<token>): the team makes one for a site in
 * the admin app and sends it on WhatsApp, and whoever opens it can pay that
 * site's plan for a fixed number of months, without signing in. Only the
 * amount, the lodge's name and its address show; the token lets someone pay,
 * nothing else.
 */

/** How long a link works. */
export const PAYMENT_LINK_DAYS = 14;

const WEB_URL = (env.WEB_URL ?? env.CORS_ORIGIN[0]!).replace(/\/$/, "");

export function paymentLinkUrl(token: string) {
  return `${WEB_URL}/pay/${token}`;
}

/** 22 URL-safe characters: short enough for a WhatsApp message, too many to guess. */
function newToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
}

type LinkRow = { token: string; plan: Plan; months: number; amountCents: number; expiresAt: Date; paidAt: Date | null; createdAt: Date };

/** A link as the admin app shows it. */
export function paymentLinkJson(link: LinkRow, now = new Date()) {
  return {
    url: paymentLinkUrl(link.token),
    plan: link.plan,
    months: link.months,
    amountCents: link.amountCents,
    expiresAt: link.expiresAt,
    paidAt: link.paidAt,
    createdAt: link.createdAt,
    state: link.paidAt ? ("paid" as const) : link.expiresAt <= now ? ("expired" as const) : ("open" as const),
  };
}

export const paymentLinkSelect = { token: true, plan: true, months: true, amountCents: true, expiresAt: true, paidAt: true, createdAt: true } as const;

/** The site's latest link, paid or not (null when it never had one). */
export async function latestPaymentLink(lodgeId: string) {
  const link = await prisma.paymentLink.findFirst({ where: { lodgeId }, orderBy: { createdAt: "desc" }, select: paymentLinkSelect });
  return link ? paymentLinkJson(link) : null;
}

/**
 * A new link for `months` of the site's own plan, at its price (founding or
 * not). The site's earlier unpaid links stop working, so only one amount is
 * ever out there.
 */
export async function createPaymentLink(lodgeId: string, months: number, createdById: string | null) {
  const now = new Date();
  const lodge = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { plan: true, founding: true } });
  const link = await prisma.$transaction(async (tx) => {
    await tx.paymentLink.updateMany({ where: { lodgeId, paidAt: null, expiresAt: { gt: now } }, data: { expiresAt: now } });
    return tx.paymentLink.create({
      data: {
        token: newToken(),
        lodgeId,
        plan: lodge.plan,
        months,
        amountCents: planPriceCents(lodge.plan, months, lodge.founding),
        expiresAt: new Date(now.getTime() + PAYMENT_LINK_DAYS * 24 * 60 * 60 * 1000),
        createdById,
      },
      select: paymentLinkSelect,
    });
  });
  return paymentLinkJson(link, now);
}
