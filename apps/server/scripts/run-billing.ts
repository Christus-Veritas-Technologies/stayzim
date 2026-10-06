/**
 * Runs the billing job now, instead of waiting for the hourly run: invoices and
 * reminders, overdue and offline sites, and deleting old unpaid demos. Safe to
 * run any time; nothing is sent twice.
 *
 *   pnpm --filter server run-billing
 *   pnpm --filter server run-billing --now 2026-11-03T08:00:00Z   # as if it were then (testing)
 */
import { parseArgs } from "node:util";

import prisma from "@stayzim/db";

import { runBilling } from "../src/jobs/billing";

const { values } = parseArgs({ options: { now: { type: "string" } } });
const now = values.now ? new Date(values.now) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error("\n--now is a date and time, e.g. 2026-11-03T08:00:00Z\n");
  process.exit(1);
}

const report = await runBilling(now);
console.log(`\nBilling run for ${now.toISOString()}:`, report, "\n");
await prisma.$disconnect();
