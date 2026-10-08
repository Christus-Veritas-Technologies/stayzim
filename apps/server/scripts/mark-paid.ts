/**
 * Records a payment the team confirmed by hand (a Paynow payment whose result
 * never reached us, or one agreed with an owner), puts the lodge on its plan,
 * paid up for the months, and emails the owner a receipt. Also sets a lodge's status by hand,
 * and lists every lodge with what it owes.
 *
 *   pnpm --filter server mark-paid --slug mistvalley [--months 1] [--plan growth] [--amount 40] \
 *     [--channel ecocash|innbucks|cash|bank] [--note "EcoCash ref MP2610.1234"] [--template starter-veranda]
 *   pnpm --filter server mark-paid --slug mistvalley --status overdue|suspended|active
 *   pnpm --filter server mark-paid --list
 */
import { parseArgs } from "node:util";

import prisma from "@stayzim/db";
import { DEFAULT_TEMPLATE, findTemplate, formatCents, formatHarareDate, formatHarareDateTime, isPlan, planPriceCents, PLANS_LABEL, templateAllowed } from "@stayzim/sites";

import { recordManualPayment } from "../src/lib/billing";

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    months: { type: "string", default: "1" },
    plan: { type: "string" },
    amount: { type: "string" },
    channel: { type: "string", default: "ecocash" },
    note: { type: "string" },
    template: { type: "string" },
    status: { type: "string" },
    list: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (values.list) {
  const lodges = await prisma.lodge.findMany({
    select: { slug: true, plan: true, status: true, paidUntil: true, demoEndsAt: true },
    orderBy: [{ status: "asc" }, { slug: "asc" }],
  });
  console.log("");
  for (const lodge of lodges) {
    const when =
      lodge.status === "DEMO"
        ? `demo until ${lodge.demoEndsAt ? formatHarareDateTime(lodge.demoEndsAt) : "?"}`
        : lodge.paidUntil
          ? `paid until ${formatHarareDate(lodge.paidUntil)}`
          : "no end date";
    console.log(`${lodge.slug.padEnd(28)} ${lodge.status.padEnd(9)} ${PLANS_LABEL[lodge.plan].padEnd(7)} ${when}`);
  }
  console.log("");
  await prisma.$disconnect();
  process.exit(0);
}

const slug = values.slug?.trim().toLowerCase();
if (!slug) fail("Pass --slug, e.g. --slug mistvalley (or --list).");
const lodge = await prisma.lodge.findUnique({ where: { slug }, select: { id: true, name: true, plan: true, status: true } });
if (!lodge) fail(`No lodge with the slug "${slug}".`);

if (values.status) {
  const status = values.status.toUpperCase();
  if (status !== "ACTIVE" && status !== "OVERDUE" && status !== "SUSPENDED") fail("--status is active, overdue or suspended.");
  await prisma.lodge.update({ where: { id: lodge.id }, data: { status, ...(status === "ACTIVE" ? { demoEndsAt: null } : {}) } });
  console.log(`\n${lodge.name} is now ${status.toLowerCase()}.${status === "ACTIVE" ? "" : " A payment (Paynow or mark-paid) makes it active again."}\n`);
  await prisma.$disconnect();
  process.exit(0);
}

const months = Number(values.months);
if (!Number.isInteger(months) || months < 1 || months > 24) fail("--months is a whole number from 1 to 24.");
const plan = values.plan ? values.plan.toUpperCase() : lodge.plan;
if (!isPlan(plan)) fail("--plan is starter, growth or pro.");
// A plan without the lodge's design: --template picks one of its designs, else the plan's default shows
const design = values.template ? findTemplate(values.template) : undefined;
if (values.template && (!design || !templateAllowed(design, plan))) fail(`--template is one of ${PLANS_LABEL[plan]}'s designs (or a cheaper plan's), e.g. ${DEFAULT_TEMPLATE[plan]}.`);
const amountCents = values.amount ? Math.round(Number(values.amount) * 100) : planPriceCents(plan, months);
if (!Number.isFinite(amountCents) || amountCents <= 0) fail("--amount is in dollars, e.g. --amount 40.");

const payment = await recordManualPayment({
  lodgeId: lodge.id,
  plan,
  months,
  amountCents,
  channel: values.channel.trim().toLowerCase(),
  note: values.note?.trim() || "Recorded with mark-paid",
  template: design?.key,
});
const after = await prisma.lodge.findUniqueOrThrow({ where: { id: lodge.id }, select: { paidUntil: true } });
console.log(`\nRecorded ${formatCents(amountCents)} for ${lodge.name}: ${PLANS_LABEL[plan]}, ${months} ${months === 1 ? "month" : "months"}.`);
console.log(`Receipt ${payment.receiptNumber} emailed to the owner. The site is live until ${after.paidUntil ? formatHarareDate(after.paidUntil) : "?"}.\n`);
await prisma.$disconnect();
