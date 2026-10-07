/**
 * The /create drop-off funnel: how many visitors reached each step, per
 * advert source, from the "create" landing events.
 *
 *   pnpm --filter server funnel                    # the last 7 days
 *   pnpm --filter server funnel --days 30
 *   pnpm --filter server funnel --source meta      # one utm_source only
 *
 * In the container: cd /app/apps/server && bun scripts/funnel.ts --days 30
 */
import { parseArgs } from "node:util";

import prisma from "@stayzim/db";

/** In order; the same names as CreateStep in apps/web/src/lib/track.ts */
const STEPS = ["open", "look", "lodge", "photo", "live", "claim"] as const;

const { values } = parseArgs({ options: { days: { type: "string", default: "7" }, source: { type: "string" } } });
const days = Number(values.days);
if (!Number.isInteger(days) || days < 1) {
  console.error("\n--days is a whole number of days, e.g. --days 30\n");
  process.exit(1);
}
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// One row per source, step and visitor: a visitor who reloads a step counts once
const rows = await prisma.landingEvent.groupBy({
  by: ["utmSource", "cta", "visitorId"],
  where: {
    type: "CTA_CLICK",
    section: "create",
    createdAt: { gte: since },
    ...(values.source ? { utmSource: values.source === "none" ? null : values.source } : {}),
  },
});

const counts = new Map<string, Map<string, number>>();
for (const row of rows) {
  const source = row.utmSource ?? "none";
  const step = row.cta?.replace(/^create_/, "") ?? "";
  const bySource = counts.get(source) ?? new Map<string, number>();
  bySource.set(step, (bySource.get(step) ?? 0) + 1);
  counts.set(source, bySource);
}

console.log(`\n/create funnel, last ${days} ${days === 1 ? "day" : "days"} (people per step, % of those who opened it)\n`);
if (counts.size === 0) console.log("  No visits yet.\n");
for (const [source, bySource] of [...counts].sort((a, b) => (b[1].get("open") ?? 0) - (a[1].get("open") ?? 0))) {
  const opened = bySource.get("open") ?? 0;
  console.log(`  utm_source: ${source}`);
  for (const step of STEPS) {
    const count = bySource.get(step) ?? 0;
    const share = opened ? `${Math.round((count / opened) * 100)}%` : "–";
    console.log(`    ${step.padEnd(6)} ${String(count).padStart(6)}  ${share.padStart(4)}`);
  }
  console.log("");
}
await prisma.$disconnect();
