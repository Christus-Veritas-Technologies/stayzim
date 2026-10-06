/**
 * Creates a lodge for an owner who already has a login (see create-owner).
 * Every lodge starts on a 14-day Growth trial.
 *
 *   pnpm --filter @stayzim/db create-lodge --owner owner@lodge.co.zw --name "Mist Valley Lodge" --slug mistvalley \
 *     --town Nyanga --region Manicaland --whatsapp 263771234567
 *
 * Add --demo to fill in three sample rooms, for a walk-in demo.
 */
import { parseArgs } from "node:util";

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
    "trial-days": { type: "string", default: "14" },
    demo: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Subdomains we use ourselves. Mirrored in apps/server/src/lib/sites.ts. */
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "media", "outreach", "help", "status", "demo", "sites"]);

const email = values.owner?.trim().toLowerCase();
if (!email) fail("Pass --owner with the owner's login email.");
const name = values.name?.trim();
if (!name) fail('Pass --name, e.g. --name "Mist Valley Lodge".');

const slug = values.slug?.trim().toLowerCase();
if (!slug || !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) {
  fail("Pass --slug: 3–40 lowercase letters, digits or dashes, e.g. mistvalley.");
}
if (RESERVED.has(slug)) fail(`"${slug}" is reserved. Pick another --slug.`);

const plan = values.plan.toUpperCase();
if (plan !== "STARTER" && plan !== "GROWTH" && plan !== "PRO") fail("--plan is starter, growth or pro.");

const trialDays = Number(values["trial-days"]);
if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 90) fail("--trial-days is a whole number from 0 to 90.");

const whatsapp = values.whatsapp?.replace(/\D/g, "") || null;
if (whatsapp && !/^\d{9,15}$/.test(whatsapp)) fail("--whatsapp is the full number with the country code, e.g. 263771234567.");

const owner = await prisma.user.findUnique({ where: { email }, include: { lodge: { select: { slug: true } } } });
if (!owner) fail(`No login for ${email}. Create it first with: pnpm --filter @stayzim/auth create-owner`);
if (owner.lodge) fail(`${email} already manages ${owner.lodge.slug}.stayzim.co.zw.`);
if (await prisma.lodge.findUnique({ where: { slug } })) fail(`${slug}.stayzim.co.zw is taken.`);

const DEMO_ROOMS = [
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
    status: trialDays > 0 ? "TRIAL" : "ACTIVE",
    trialEndsAt: trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
    ownerId: owner.id,
    rooms: values.demo ? { create: DEMO_ROOMS.map((room, position) => ({ ...room, position })) } : undefined,
  },
});

console.log(`\nCreated ${lodge.name} at ${lodge.slug}.stayzim.co.zw for ${owner.name} <${email}>`);
console.log(trialDays > 0 ? `${plan} trial for ${trialDays} days.` : `${plan}, active.`);
if (values.demo) console.log(`Added ${DEMO_ROOMS.length} demo rooms.`);
console.log("");
await prisma.$disconnect();
