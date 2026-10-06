import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { isPlan, PAY_MONTHS, planPriceCents } from "@stayzim/sites";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { BILLING_URL, newPaymentReference, paymentJson, refreshPayment } from "../lib/billing";
import { clientIp } from "../lib/ip";
import { lodgeJson, type LodgeVariables } from "../lib/lodge";
import { MOBILE_CHANNELS, paynowEnabled, startMobilePayment, startWebPayment } from "../lib/paynow";
import { validJson } from "../lib/validate";

const paySchema = z.object({
  plan: z.string().refine(isPlan, "Pick a plan"),
  months: z.number().refine((value) => (PAY_MONTHS as readonly number[]).includes(value), "Pick 1, 3 or 12 months"),
  channel: z.enum([...MOBILE_CHANNELS, "web"]),
  /** The mobile money number, for a phone prompt */
  phone: z.string().trim().optional(),
});

/** "+263 77 123 4567", "0771234567" or "263771234567" → "0771234567", as Paynow wants it. */
export function paynowPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (/^2637\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^07\d{8}$/.test(digits)) return digits;
  if (/^7\d{8}$/.test(digits)) return `0${digits}`;
  return null;
}

/** /api/lodge/billing: the owner's invoices and payments, and paying on Paynow. */
export const billing = new Hono<{ Variables: LodgeVariables }>()
  .get("/", async (c) => {
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({ where: { lodgeId: c.var.lodgeId, status: { not: "VOID" } }, orderBy: { dueAt: "desc" }, take: 24 }),
      prisma.payment.findMany({ where: { lodgeId: c.var.lodgeId, status: "PAID" }, orderBy: { paidAt: "desc" }, take: 24 }),
    ]);
    return c.json({
      paynow: paynowEnabled,
      invoices: invoices.map(({ id, number, plan, amountCents, periodStart, periodEnd, dueAt, status, paidAt }) => ({
        id,
        number,
        plan,
        amountCents,
        periodStart,
        periodEnd,
        dueAt,
        status,
        paidAt,
      })),
      payments: payments.map(paymentJson),
    });
  })

  /**
   * Starts a Paynow payment: a prompt on the owner's phone (EcoCash, OneMoney),
   * a code for InnBucks, or Paynow's page for everything else ("web").
   */
  .post(
    "/pay",
    rateLimiter({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: "draft-7", keyGenerator: clientIp }),
    validJson(paySchema),
    async (c) => {
      if (!paynowEnabled) throw new HTTPException(503, { message: "Paying online isn't switched on yet. Use EcoCash or InnBucks below, then tap I have paid." });
      const input = c.req.valid("json");
      const plan = input.plan as Parameters<typeof planPriceCents>[0];
      const phone = input.channel === "web" ? null : paynowPhone(input.phone ?? "");
      if (input.channel !== "web" && !phone) throw new HTTPException(400, { message: "Enter the mobile money number, like 077 123 4567." });

      const lodge = await prisma.lodge.findUniqueOrThrow({
        where: { id: c.var.lodgeId },
        select: { id: true, name: true, owner: { select: { email: true } } },
      });
      const invoice = await prisma.invoice.findFirst({ where: { lodgeId: lodge.id, status: "OPEN", plan }, orderBy: { dueAt: "asc" } });
      const payment = await prisma.payment.create({
        data: {
          lodgeId: lodge.id,
          invoiceId: input.months === 1 ? (invoice?.id ?? null) : null,
          plan,
          months: input.months,
          amountCents: planPriceCents(plan, input.months),
          method: "PAYNOW",
          channel: input.channel,
          reference: newPaymentReference(),
          phone,
        },
      });

      const common = {
        reference: payment.reference,
        amountCents: payment.amountCents,
        info: `StayZim ${plan} ${input.months} month${input.months === 1 ? "" : "s"}`,
        email: lodge.owner.email,
        resultUrl: `${env.BETTER_AUTH_URL}/api/paynow/result`,
        returnUrl: `${BILLING_URL}?payment=${payment.id}`,
      };
      const started = await (input.channel === "web"
        ? startWebPayment(common)
        : startMobilePayment({ ...common, phone: phone!, channel: input.channel })
      ).catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? `Paynow didn't answer (${error.message}). Try again.` : "Paynow didn't answer. Try again." }));

      if (!started.ok) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        throw new HTTPException(502, { message: started.error });
      }
      await prisma.payment.update({ where: { id: payment.id }, data: { pollUrl: started.pollUrl, paynowReference: started.paynowReference } });
      return c.json(
        {
          payment: paymentJson({ ...payment, pollUrl: started.pollUrl }),
          redirectUrl: started.redirectUrl ?? null,
          instructions: started.instructions ?? null,
          innbucksCode: started.innbucksCode ?? null,
        },
        201,
      );
    },
  )

  /** How a payment is going; checks with Paynow while it's pending. Returns the lodge too, which changes once it's paid. */
  .get("/payments/:id", async (c) => {
    const owned = await prisma.payment.findFirst({ where: { id: c.req.param("id"), lodgeId: c.var.lodgeId }, select: { id: true } });
    if (!owned) throw new HTTPException(404, { message: "No such payment" });
    const payment = await refreshPayment(owned.id);
    return c.json({ payment: paymentJson(payment), lodge: await lodgeJson(c.var.lodgeId) });
  })

  /** An invoice (SZ-…) or receipt (R-…), for the printable page. */
  .get("/documents/:number", async (c) => {
    const number = c.req.param("number").toUpperCase();
    const lodge = await prisma.lodge.findUniqueOrThrow({
      where: { id: c.var.lodgeId },
      select: { name: true, slug: true, town: true, region: true, owner: { select: { name: true, email: true } } },
    });
    const billedTo = { lodge: lodge.name, slug: lodge.slug, place: [lodge.town, lodge.region].filter(Boolean).join(", ") || null, name: lodge.owner.name, email: lodge.owner.email };

    if (number.startsWith("SZ-")) {
      const invoice = await prisma.invoice.findFirst({ where: { number, lodgeId: c.var.lodgeId } });
      if (!invoice || invoice.status === "VOID") throw new HTTPException(404, { message: "No such invoice" });
      return c.json({
        kind: "invoice" as const,
        number: invoice.number,
        issuedAt: invoice.createdAt,
        billedTo,
        plan: invoice.plan,
        months: 1,
        amountCents: invoice.amountCents,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        dueAt: invoice.dueAt,
        status: invoice.status,
        paidAt: invoice.paidAt,
      });
    }
    const payment = await prisma.payment.findFirst({ where: { receiptNumber: number, lodgeId: c.var.lodgeId, status: "PAID" } });
    if (!payment) throw new HTTPException(404, { message: "No such receipt" });
    return c.json({
      kind: "receipt" as const,
      number: payment.receiptNumber!,
      issuedAt: payment.paidAt!,
      billedTo,
      plan: payment.plan,
      months: payment.months,
      amountCents: payment.amountCents,
      reference: payment.reference,
      channelName: paymentJson(payment).channelName,
      status: "PAID" as const,
      paidAt: payment.paidAt,
    });
  });
