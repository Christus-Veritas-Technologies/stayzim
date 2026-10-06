/**
 * Updates a change request after StayZim works on it. The owner sees the
 * status and reply in their dashboard.
 *
 *   pnpm --filter @stayzim/db resolve-request --ref R-7K2Q --status done --reply "New headline is live"
 *   pnpm --filter @stayzim/db resolve-request --ref R-7K2Q --status in-progress
 *   pnpm --filter @stayzim/db resolve-request --list
 */
import { parseArgs } from "node:util";

import prisma from "../src/index";

const { values } = parseArgs({
  options: {
    ref: { type: "string" },
    status: { type: "string" },
    reply: { type: "string" },
    list: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (values.list) {
  const open = await prisma.changeRequest.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    orderBy: { createdAt: "asc" },
    include: { lodge: { select: { name: true, slug: true } } },
  });
  if (open.length === 0) console.log("\nNo open requests.\n");
  for (const request of open) {
    console.log(`\n${request.reference}  ${request.status}  ${request.lodge.name} (${request.lodge.slug})  ${request.topic}`);
    console.log(`  ${request.message.replace(/\n/g, "\n  ")}`);
  }
  console.log("");
  await prisma.$disconnect();
  process.exit(0);
}

const STATUSES = { open: "OPEN", "in-progress": "IN_PROGRESS", done: "DONE", declined: "DECLINED" } as const;
const reference = values.ref?.trim().toUpperCase();
if (!reference) fail("Pass --ref, e.g. --ref R-7K2Q (or --list to see open requests).");
const status = STATUSES[(values.status ?? "") as keyof typeof STATUSES];
if (!status) fail("Pass --status: open, in-progress, done or declined.");

const request = await prisma.changeRequest.findUnique({ where: { reference } });
if (!request) fail(`No request ${reference}.`);

await prisma.changeRequest.update({
  where: { reference },
  data: {
    status,
    reply: values.reply?.trim() || request.reply,
    resolvedAt: status === "DONE" || status === "DECLINED" ? new Date() : null,
  },
});
console.log(`\n${reference} is now ${status.toLowerCase().replace("_", " ")}.\n`);
await prisma.$disconnect();
