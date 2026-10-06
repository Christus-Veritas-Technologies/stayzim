import prisma from "@stayzim/db";
import { sendEmail } from "@stayzim/mail";
import { demoWelcomeEmail, receiptEmail } from "@stayzim/mail/templates";
import {
  addMonths,
  extendPaidUntil,
  formatCents,
  formatHarareDate,
  formatHarareDateTime,
  formatHarareDay,
  planPriceCents,
  PLANS_LABEL,
  type Plan,
} from "@stayzim/sites";

import { pollPayment } from "./paynow";
import { DASHBOARD_URL, siteUrlFor } from "./sites";

/**
 * Billing for lodges: invoices, payments and the emails about them. Used by
 * the routes (sign-up, Billing, Paynow's result URL), the hourly job and the
 * mark-paid script. Dates and prices come from @stayzim/sites.
 */

export const BILLING_URL = `${DASHBOARD_URL}/billing`;

const CHANNEL_NAMES: Record<string, string> = {
  ecocash: "EcoCash",
  onemoney: "OneMoney",
  innbucks: "InnBucks",
  web: "Paynow",
  cash: "Cash",
  bank: "Bank transfer",
  paynow: "Paynow",
};

export function channelName(channel: string) {
  return CHANNEL_NAMES[channel] ?? channel;
}

/** Sends an email without letting a mail failure break the request that caused it. Returns whether it went. */
export async function sendQuietly(email: Parameters<typeof sendEmail>[0], what: string) {
  try {
    await sendEmail(email);
    return true;
  } catch (error) {
    console.error(`[mail] Could not send ${what} to ${email.to}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Sends a billing email once: the key ("invoice:<id>:DUE_IN_1") is stored first,
 * so a second run skips it; if sending fails, the key is removed to try again
 * next time.
 */
export async function sendOnce(key: string, lodgeId: string, kind: string, email: Parameters<typeof sendEmail>[0]) {
  try {
    await prisma.billingNotice.create({ data: { key, lodgeId, kind } });
  } catch {
    return false; // Sent already
  }
  const sent = await sendQuietly(email, kind.toLowerCase().replace(/_/g, " "));
  if (!sent) await prisma.billingNotice.delete({ where: { key } }).catch(() => {});
  return sent;
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** The next running number: "SZ-2026-00042" for invoices, "R-2026-00007" for receipts. */
async function nextNumber(tx: Tx, kind: "invoice" | "receipt", now: Date) {
  const year = now.getUTCFullYear();
  const counter = await tx.billingCounter.upsert({
    where: { name: `${kind}-${year}` },
    create: { name: `${kind}-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${kind === "invoice" ? "SZ" : "R"}-${year}-${String(counter.value).padStart(5, "0")}`;
}

/** An invoice for one month of `plan`, from `dueAt`. */
export async function createInvoice(lodgeId: string, plan: Plan, dueAt: Date) {
  return prisma.$transaction(async (tx) =>
    tx.invoice.create({
      data: {
        number: await nextNumber(tx, "invoice", new Date()),
        lodgeId,
        plan,
        amountCents: planPriceCents(plan),
        periodStart: dueAt,
        periodEnd: addMonths(dueAt, 1),
        dueAt,
      },
    }),
  );
}

/** Right after an owner makes their demo at /start: its first invoice, due when the demo ends, and the welcome email. */
export async function onDemoCreated(lodgeId: string) {
  const lodge = await prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    select: { name: true, slug: true, customDomain: true, plan: true, demoEndsAt: true, owner: { select: { name: true, email: true } } },
  });
  if (lodge.demoEndsAt) await createInvoice(lodgeId, lodge.plan, lodge.demoEndsAt);
  await sendQuietly(
    demoWelcomeEmail({
      to: lodge.owner.email,
      name: lodge.owner.name,
      lodgeName: lodge.name,
      siteUrl: siteUrlFor(lodge),
      dashboardUrl: DASHBOARD_URL,
      plan: PLANS_LABEL[lodge.plan],
      price: formatCents(planPriceCents(lodge.plan)),
      endsAt: lodge.demoEndsAt ? formatHarareDateTime(lodge.demoEndsAt) : "in 2 days",
    }),
    "the welcome email",
  );
}

/** Our payment reference: short, easy to read out, unique. */
export function newPaymentReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `SZP-${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}

/**
 * Marks a payment paid and puts the lodge on its plan, paid up for its months
 * more. Idempotent: Paynow's result POST, the owner's screen polling and a
 * retry can all call it; only the first changes anything. Then the receipt.
 */
export async function applyPayment(paymentId: string, extra: { paynowReference?: string } = {}) {
  const now = new Date();
  const applied = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: now, ...(extra.paynowReference ? { paynowReference: extra.paynowReference } : {}) },
    });
    if (claimed.count === 0) return null;

    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { receiptNumber: await nextNumber(tx, "receipt", now) },
    });
    const lodge = await tx.lodge.findUniqueOrThrow({ where: { id: payment.lodgeId }, select: { paidUntil: true, status: true } });
    const paidUntil = extendPaidUntil(lodge.status === "DEMO" ? null : lodge.paidUntil, now, payment.months);
    await tx.lodge.update({
      where: { id: payment.lodgeId },
      data: { plan: payment.plan, status: "ACTIVE", demoEndsAt: null, paidUntil },
    });
    // Whatever was still owed is covered now: paid if it was for this plan, else no longer owed
    await tx.invoice.updateMany({ where: { lodgeId: payment.lodgeId, status: "OPEN", plan: payment.plan }, data: { status: "PAID", paidAt: now } });
    await tx.invoice.updateMany({ where: { lodgeId: payment.lodgeId, status: "OPEN" }, data: { status: "VOID" } });
    if (payment.invoiceId) await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: "PAID", paidAt: now } });
    return { payment, paidUntil };
  });
  if (!applied) return false;

  const { payment, paidUntil } = applied;
  const lodge = await prisma.lodge.findUniqueOrThrow({ where: { id: payment.lodgeId }, select: { name: true, owner: { select: { name: true, email: true } } } });
  await sendOnce(
    `payment:${payment.id}:RECEIPT`,
    payment.lodgeId,
    "RECEIPT",
    receiptEmail({
      to: lodge.owner.email,
      name: lodge.owner.name,
      lodgeName: lodge.name,
      number: payment.receiptNumber!,
      amount: formatCents(payment.amountCents),
      plan: PLANS_LABEL[payment.plan],
      months: payment.months,
      paidOn: formatHarareDay(now),
      method: channelName(payment.channel),
      paidUntil: formatHarareDate(paidUntil),
      receiptUrl: `${BILLING_URL}/${payment.receiptNumber}`,
    }),
  );
  return true;
}

/** Records a payment StayZim received another way (cash, bank, merchant code) and applies it. */
export async function recordManualPayment(input: { lodgeId: string; plan: Plan; months: number; amountCents?: number; channel: string; note?: string }) {
  const invoice = await prisma.invoice.findFirst({ where: { lodgeId: input.lodgeId, status: "OPEN" }, orderBy: { dueAt: "asc" } });
  const payment = await prisma.payment.create({
    data: {
      lodgeId: input.lodgeId,
      invoiceId: invoice?.plan === input.plan ? invoice.id : null,
      plan: input.plan,
      months: input.months,
      amountCents: input.amountCents ?? planPriceCents(input.plan, input.months),
      method: "MANUAL",
      channel: input.channel,
      reference: newPaymentReference(),
      note: input.note,
    },
  });
  await applyPayment(payment.id);
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

const POLL_EVERY_MS = 5_000;

/**
 * Asks Paynow how a pending payment is going (at most every 5 seconds per
 * payment), and applies it once it's paid. Returns the payment as it stands.
 */
export async function refreshPayment(paymentId: string, { force = false } = {}) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "PENDING" || !payment.pollUrl) return payment;
  if (!force && payment.lastPolledAt && Date.now() - payment.lastPolledAt.getTime() < POLL_EVERY_MS) return payment;

  await prisma.payment.update({ where: { id: paymentId }, data: { lastPolledAt: new Date() } });
  const status = await pollPayment(payment.pollUrl).catch((error: unknown) => {
    console.error(`[paynow] Could not check ${payment.reference}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  if (!status || status.reference !== payment.reference) return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

  if (status.outcome === "PAID") {
    // Paynow says paid: check it's the amount we asked for before applying it
    if (Math.round(Number(status.amount) * 100) !== payment.amountCents) {
      console.error(`[paynow] ${payment.reference} was paid ${status.amount}, expected ${formatCents(payment.amountCents)}. Not applied; check it by hand.`);
    } else {
      await applyPayment(paymentId, { paynowReference: status.paynowReference });
    }
  } else if (status.outcome !== "PENDING") {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: status.outcome, paynowReference: status.paynowReference } });
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
}

/** A payment as the dashboard sees it. */
export function paymentJson(payment: Awaited<ReturnType<typeof prisma.payment.findUniqueOrThrow>>) {
  return {
    id: payment.id,
    reference: payment.reference,
    plan: payment.plan,
    months: payment.months,
    amountCents: payment.amountCents,
    method: payment.method,
    channel: payment.channel,
    channelName: channelName(payment.channel),
    status: payment.status,
    receiptNumber: payment.receiptNumber,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  };
}
