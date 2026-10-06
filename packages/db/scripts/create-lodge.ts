/**
 * Creates a lodge for an owner who already has a login (see create-owner).
 * Owners usually sign up themselves; this is for lodges StayZim sets up.
 * Like a sign-up, the lodge starts as a 2-day demo, unless --paid-months says
 * it's paid for already (record the payment itself with mark-paid, which also
 * emails a receipt).
 *
 *   pnpm --filter @stayzim/db create-lodge --owner owner@lodge.co.zw --name "Mist Valley Lodge" --slug mistvalley \
 *     --town Nyanga --region Manicaland --whatsapp 263771234567 [--plan growth] [--paid-months 1]
 *
 * Add --sample-rooms to fill in three sample rooms.
 */
import { parseArgs } from "node:util";

import { addDays, addMonths, DEMO_DAYS, isPlan, slugProblem } from "@stayzim/sites";

import prisma from "../src/index";

const { values } = parseArgs({
  options: {
    owner: { type: "string" },
    name: { type: "string" },
    slug: { type: "string" },
    town: { type: "string" },
    region: { type: "string" },
    whatsapp: { type: "string" },
    plan: { type: "string", default: "growth" },
    "paid-months": { type: "string", default: "0" },
    "sample-rooms": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const email = values.owner?.trim().toLowerCase();
if (!email) fail("Pass --owner with the owner's login email.");
const name = values.name?.trim();
if (!name) fail('Pass --name, e.g. --name "Mist Valley Lodge".');

const slug = values.slug?.trim().toLowerCase();
if (!slug) fail("Pass --slug, e.g. --slug mistvalley.");
const problem = slugProblem(slug);
if (problem) fail(`--slug ${slug}: ${problem}`);

const plan = values.plan.toUpperCase();
if (!isPlan(plan)) fail("--plan is starter, growth or pro.");

const paidMonths = Number(values["paid-months"]);
if (!Number.isInteger(paidMonths) || paidMonths < 0 || paidMonths > 24) fail("--paid-months is a whole number from 0 to 24.");

const whatsapp = values.whatsapp?.replace(/\D/g, "") || null;
if (whatsapp && !/^\d{9,15}$/.test(whatsapp)) fail("--whatsapp is the full number with the country code, e.g. 263771234567.");

const owner = await prisma.user.findUnique({ where: { email }, include: { lodge: { select: { slug: true } } } });
if (!owner) fail(`No login for ${email}. Create it first with: pnpm --filter @stayzim/auth create-owner`);
if (owner.lodge) fail(`${email} already manages ${owner.lodge.slug}.stayzim.co.zw.`);
if (await prisma.lodge.findUnique({ where: { slug } })) fail(`${slug}.stayzim.co.zw is taken.`);

const SAMPLE_ROOMS = [
  { name: "Garden Cottage", price: 85, sleeps: 2, amenities: ["wifi", "fireplace", "parking"] },
  { name: "River Suite", price: 120, sleeps: 2, amenities: ["wifi", "bath", "breakfast"] },
  { name: "Family Chalet", price: 150, sleeps: 5, amenities: ["wifi", "braai", "kitchen", "parking"] },
];

const lodge = await prisma.lodge.create({
  data: {
    slug,
    name,
    town: values.town?.trim() || null,
    region: values.region?.trim() || null,
    whatsapp,
    plan,
    status: paidMonths > 0 ? "ACTIVE" : "DEMO",
    demoEndsAt: paidMonths > 0 ? null : addDays(new Date(), DEMO_DAYS),
    paidUntil: paidMonths > 0 ? addMonths(new Date(), paidMonths) : null,
    ownerId: owner.id,
    rooms: values["sample-rooms"] ? { create: SAMPLE_ROOMS.map((room, position) => ({ ...room, position })) } : undefined,
  },
});

console.log(`\nCreated ${lodge.name} at ${lodge.slug}.stayzim.co.zw for ${owner.name} <${email}>`);
console.log(
  paidMonths > 0
    ? `${plan}, active, paid until ${lodge.paidUntil?.toDateString()}.`
    : `${plan} demo for ${DEMO_DAYS} days (until ${lodge.demoEndsAt?.toLocaleString()}).`,
);
if (values["sample-rooms"]) console.log(`Added ${SAMPLE_ROOMS.length} sample rooms.`);
console.log("");
await prisma.$disconnect();
