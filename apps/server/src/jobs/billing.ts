import prisma from "@stayzim/db";
import { demoEndedEmail, invoiceEmail, siteOfflineEmail } from "@stayzim/mail/templates";
import {
  addDays,
  calendarDaysUntil,
  DEMO_KEEP_DAYS,
  demoEnded,
  formatCents,
  formatHarareDate,
  formatHarareDay,
  noticeFor,
  planPriceCents,
  PLANS_LABEL,
  statusFor,
} from "@stayzim/sites";

import { BILLING_URL, createInvoice, refreshPayment, sendOnce } from "../lib/billing";
import { issuerLine } from "../lib/business";
import { removeUploads } from "../lib/uploads";

/**
 * The billing job, hourly (and from scripts/run-billing.ts). Every step is safe
 * to run again: invoices are found before they're made, and each email is sent
 * once (BillingNotice).
 *
 * 1. Invoices: 3 days before a paid period ends, the next month's invoice; then
 *    reminders 3 days before, the day before and on the day. Demos: their
 *    first invoice (made at sign-up), with reminders the day before and on the day.
 * 2. Status: Active → Payment due when the period ends → offline 3 days later.
 *    An ended demo goes offline by itself (computed when the site is served);
 *    here it gets its "your demo has ended" email.
 * 3. Payments still pending (a missed Paynow callback): asked again.
 * 4. Demos that ended 30 days ago and were never paid for: deleted.
 */
export async function runBilling(now = new Date()) {
  const report = { invoices: 0, notices: 0, overdue: 0, suspended: 0, checked: 0, deleted: 0 };

  // 1 and 2: lodges that pay
  const paying = await prisma.lodge.findMany({
    where: { status: { in: ["ACTIVE", "OVERDUE", "SUSPENDED"] }, paidUntil: { not: null } },
    select: { id: true, name: true, plan: true, status: true, paidUntil: true, owner: { select: { name: true, email: true } } },
  });
  for (const lodge of paying) {
    const paidUntil = lodge.paidUntil!;

    if (lodge.status !== "SUSPENDED" && calendarDaysUntil(paidUntil, now) <= 3) {
      let invoice = await prisma.invoice.findFirst({ where: { lodgeId: lodge.id, dueAt: paidUntil, status: { not: "VOID" } } });
      if (!invoice) {
        invoice = await createInvoice(lodge.id, lodge.plan, paidUntil);
        report.invoices += 1;
      }
      const notice = noticeFor(invoice.dueAt, now);
      if (notice && invoice.status === "OPEN") {
        const sent = await sendOnce(
          `invoice:${invoice.id}:${notice}`,
          lodge.id,
          notice,
          invoiceEmail({
            to: lodge.owner.email,
            name: lodge.owner.name,
            lodgeName: lodge.name,
            notice,
            demo: false,
            number: invoice.number,
            plan: PLANS_LABEL[invoice.plan],
            amount: formatCents(invoice.amountCents),
            period: `${formatHarareDay(invoice.periodStart)} to ${formatHarareDay(invoice.periodEnd)}`,
            due: formatHarareDate(invoice.dueAt),
            payUrl: BILLING_URL,
            issuedBy: issuerLine(),
          }),
        );
        if (sent) report.notices += 1;
      }
    }

    const next = statusFor({ status: lodge.status, paidUntil }, now);
    if (next !== lodge.status) {
      await prisma.lodge.update({ where: { id: lodge.id }, data: { status: next } });
      if (next === "OVERDUE") report.overdue += 1;
      if (next === "SUSPENDED") {
        report.suspended += 1;
        const sent = await sendOnce(
          `lodge:${lodge.id}:SITE_OFFLINE:${paidUntil.toISOString()}`,
          lodge.id,
          "SITE_OFFLINE",
          siteOfflineEmail({ to: lodge.owner.email, name: lodge.owner.name, lodgeName: lodge.name, amount: formatCents(planPriceCents(lodge.plan)), payUrl: BILLING_URL }),
        );
        if (sent) report.notices += 1;
      }
    }
  }

  // 1 and 2: demos
  const demos = await prisma.lodge.findMany({
    where: { status: "DEMO", demoEndsAt: { not: null } },
    select: { id: true, name: true, plan: true, status: true, demoEndsAt: true, owner: { select: { name: true, email: true } } },
  });
  for (const lodge of demos) {
    const endsAt = lodge.demoEndsAt!;
    if (demoEnded(lodge, now)) {
      // Long gone (step 4 deletes it): no point telling them now
      if (endsAt < addDays(now, -DEMO_KEEP_DAYS)) continue;
      const sent = await sendOnce(
        `lodge:${lodge.id}:DEMO_ENDED:${endsAt.toISOString()}`,
        lodge.id,
        "DEMO_ENDED",
        demoEndedEmail({ to: lodge.owner.email, name: lodge.owner.name, lodgeName: lodge.name, payUrl: BILLING_URL, keptUntil: formatHarareDate(addDays(endsAt, DEMO_KEEP_DAYS)) }),
      );
      if (sent) report.notices += 1;
      continue;
    }
    // A 2-day demo has no 3-days-before reminder: the welcome email covers it
    const notice = noticeFor(endsAt, now);
    if (!notice || notice === "DUE_IN_3") continue;
    let invoice = await prisma.invoice.findFirst({ where: { lodgeId: lodge.id, status: "OPEN" }, orderBy: { dueAt: "asc" } });
    if (!invoice) {
      invoice = await createInvoice(lodge.id, lodge.plan, endsAt);
      report.invoices += 1;
    }
    const sent = await sendOnce(
      `invoice:${invoice.id}:${notice}`,
      lodge.id,
      notice,
      invoiceEmail({
        to: lodge.owner.email,
        name: lodge.owner.name,
        lodgeName: lodge.name,
        notice,
        demo: true,
        number: invoice.number,
        plan: PLANS_LABEL[invoice.plan],
        amount: formatCents(invoice.amountCents),
        period: `${formatHarareDay(invoice.periodStart)} to ${formatHarareDay(invoice.periodEnd)}`,
        due: formatHarareDate(invoice.dueAt),
        payUrl: BILLING_URL,
        issuedBy: issuerLine(),
      }),
    );
    if (sent) report.notices += 1;
  }

  // 3: Paynow payments still waiting, in case a result POST never arrived
  const pending = await prisma.payment.findMany({
    where: { status: "PENDING", method: "PAYNOW", pollUrl: { not: null }, createdAt: { gt: addDays(now, -2), lt: new Date(now.getTime() - 2 * 60 * 1000) } },
    select: { id: true, createdAt: true },
  });
  for (const payment of pending) {
    const checked = await refreshPayment(payment.id, { force: true });
    report.checked += 1;
    // Nobody approves a prompt after a day: let it go
    if (checked.status === "PENDING" && payment.createdAt < addDays(now, -1)) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    }
  }

  // 4: demos nobody paid for, 30 days after they ended
  const stale = await prisma.lodge.findMany({
    where: { status: "DEMO", demoEndsAt: { lt: addDays(now, -DEMO_KEEP_DAYS) }, payments: { none: { status: "PAID" } } },
    select: { id: true, slug: true, logoKey: true, ownerId: true, owner: { select: { role: true } }, photos: { select: { key: true, mediumKey: true, smallKey: true } } },
  });
  for (const lodge of stale) {
    const keys = [lodge.logoKey, ...lodge.photos.flatMap((photo) => [photo.key, photo.mediumKey, photo.smallKey])].filter((key): key is string => Boolean(key));
    await prisma.$transaction([
      prisma.lodge.update({ where: { id: lodge.id }, data: { heroPhotoId: null } }),
      prisma.lodge.delete({ where: { id: lodge.id } }),
      prisma.billingNotice.deleteMany({ where: { lodgeId: lodge.id } }),
      // The account goes too (it was only for this demo), so the email can sign up again
      ...(lodge.owner.role === "OWNER" ? [prisma.user.delete({ where: { id: lodge.ownerId } })] : []),
    ]);
    await removeUploads(keys);
    console.log(`[billing] Deleted the unpaid demo ${lodge.slug} (ended over ${DEMO_KEEP_DAYS} days ago)`);
    report.deleted += 1;
  }

  return report;
}

const HOUR = 60 * 60 * 1000;
const LEASE = "billing-job";

/**
 * Takes the job for this hour, so with two servers only one runs it: a row whose
 * value is the time it last ran (seconds), claimed only if that's over 50 minutes ago.
 */
async function claimRun(now: Date) {
  const seconds = Math.floor(now.getTime() / 1000);
  await prisma.billingCounter.upsert({ where: { name: LEASE }, create: { name: LEASE, value: 0 }, update: {} });
  const claimed = await prisma.billingCounter.updateMany({ where: { name: LEASE, value: { lt: seconds - 50 * 60 } }, data: { value: seconds } });
  return claimed.count === 1;
}

async function tick() {
  const now = new Date();
  try {
    if (!(await claimRun(now))) return;
    const report = await runBilling(now);
    if (Object.values(report).some((count) => count > 0)) console.log("[billing]", JSON.stringify(report));
  } catch (error) {
    console.error("[billing] The billing job failed:", error);
  }
}

/** Runs the job a minute after the server starts, then every hour. */
export function startBillingJob() {
  setTimeout(() => void tick(), 60 * 1000);
  setInterval(() => void tick(), HOUR);
}
