/**
 * Creates the three demo lodges the landing page links to (mistvalley, msasaridge,
 * lakeview), each with its own demo owner login, so StayZim can sign in as that
 * owner and add photos from the dashboard like any lodge.
 *
 *   pnpm --filter @stayzim/auth seed-demos --whatsapp 263771234567
 *   pnpm --filter @stayzim/auth seed-demos --only lakeview
 *
 * --whatsapp: the number every Book on WhatsApp button opens (StayZim's sales
 * number, so prospects who try the demo reach us). Safe to run again: lodges that
 * already exist are left alone. Owner emails are {slug}@demo.stayzim.co.zw, a
 * domain that receives no email; give one a new password with
 * create-owner --email … --reset.
 */
import { parseArgs } from "node:util";

import prisma from "@stayzim/db";
import { createLocalAccountIssuer } from "better-auth/db";

import { auth } from "../src/index";

type DemoRoom = { name: string; price: number; sleeps: number; amenities: string[] };

type DemoLodge = {
  slug: string;
  name: string;
  town: string;
  region: string;
  /** Approximate, for the map; owners paste their exact Google Maps link */
  latitude: number;
  longitude: number;
  themeColor: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  template: string;
  description: string;
  heroHeadline: string | null;
  heroSubline: string | null;
  owner: string;
  rooms: DemoRoom[];
};

/** Matches the lodge cards on the landing page (apps/web/src/components/landing/content.ts). */
const DEMOS: DemoLodge[] = [
  {
    slug: "mistvalley",
    name: "Mist Valley Lodge",
    town: "Nyanga",
    region: "Manicaland",
    latitude: -18.2167,
    longitude: 32.75,
    themeColor: "#1E4A3B",
    plan: "GROWTH",
    template: "growth-classic",
    description:
      "Stone cottages in the pine forest above Nyanga, with log fires, quiet mornings in the mist and the trout dams a short walk away. A family-run lodge for slow weekends in the Eastern Highlands.",
    heroHeadline: null,
    heroSubline: "Log fires, misty mornings and trout dams in the Nyanga hills. Book direct with us.",
    owner: "Rudo Moyo",
    rooms: [
      { name: "Garden Cottage", price: 85, sleeps: 2, amenities: ["fireplace", "breakfast", "wifi", "parking"] },
      { name: "River Suite", price: 120, sleeps: 2, amenities: ["bath", "fireplace", "breakfast", "wifi"] },
      { name: "Family Chalet", price: 150, sleeps: 5, amenities: ["kitchen", "braai", "fireplace", "parking"] },
    ],
  },
  {
    slug: "msasaridge",
    name: "Msasa Ridge",
    town: "Vumba",
    region: "Manicaland",
    latitude: -19.1,
    longitude: 32.77,
    themeColor: "#8A4B2A",
    plan: "PRO",
    template: "pro-signature",
    description:
      "A ridge-top retreat in the Bvumba mountains, among msasa trees that turn copper every spring. Wide views to Mozambique, birdsong at dawn, and the botanical gardens ten minutes down the road.",
    heroHeadline: "Above the clouds in the Bvumba",
    heroSubline: "Mountain views, msasa woodland and long, quiet evenings. Reserve directly, no booking fees.",
    owner: "Tendai Ncube",
    rooms: [
      { name: "Forest Room", price: 95, sleeps: 2, amenities: ["breakfast", "wifi", "fireplace", "parking"] },
      { name: "Ridge View Suite", price: 140, sleeps: 2, amenities: ["bath", "fireplace", "breakfast", "wifi"] },
      { name: "Msasa Cottage", price: 165, sleeps: 4, amenities: ["kitchen", "fireplace", "braai", "parking"] },
      { name: "Honeymoon Loft", price: 190, sleeps: 2, amenities: ["bath", "breakfast", "fireplace", "wifi"] },
    ],
  },
  {
    slug: "lakeview",
    name: "Lakeview Cabins",
    town: "Kariba",
    region: "Mashonaland West",
    latitude: -16.5167,
    longitude: 28.8,
    themeColor: "#1D5C7A",
    plan: "PRO",
    template: "pro-safari",
    description:
      "Six timber cabins on the shore of Lake Kariba, with sundowners on the deck, elephants along the water's edge and tiger fishing from our jetty. Boat trips and house-boat transfers arranged on request.",
    heroHeadline: "Sunsets on Lake Kariba",
    heroSubline: "Lakeside cabins, elephants at the water's edge and fishing from our jetty.",
    owner: "Farai Chikore",
    rooms: [
      { name: "Shoreline Cabin", price: 110, sleeps: 2, amenities: ["aircon", "breakfast", "wifi", "parking"] },
      { name: "Sunset Cabin", price: 125, sleeps: 2, amenities: ["aircon", "breakfast", "pool", "wifi"] },
      { name: "Jetty Cabin", price: 135, sleeps: 3, amenities: ["aircon", "braai", "pool", "parking"] },
      { name: "Fish Eagle Cabin", price: 150, sleeps: 4, amenities: ["aircon", "kitchen", "braai", "pool"] },
      { name: "Elephant Cabin", price: 160, sleeps: 4, amenities: ["aircon", "kitchen", "braai", "tv"] },
      { name: "Family Lake House", price: 220, sleeps: 6, amenities: ["aircon", "kitchen", "pool", "braai"] },
    ],
  },
];

const { values } = parseArgs({
  options: {
    whatsapp: { type: "string" },
    only: { type: "string" },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const whatsapp = values.whatsapp?.replace(/\D/g, "") || null;
if (whatsapp && !/^\d{9,15}$/.test(whatsapp)) fail("--whatsapp is the full number with the country code, e.g. 263771234567.");

const demos = values.only ? DEMOS.filter((demo) => demo.slug === values.only) : DEMOS;
if (demos.length === 0) fail(`--only is one of ${DEMOS.map((demo) => demo.slug).join(", ")}.`);

/** Easy to read out or type on a phone: no 0/O, 1/l/I. Same as create-owner. */
function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

const ctx = await auth.$context;
const created: string[] = [];

for (const demo of demos) {
  if (await prisma.lodge.findUnique({ where: { slug: demo.slug } })) {
    console.log(`${demo.slug}: already exists, left as it is.`);
    continue;
  }

  const email = `${demo.slug}@demo.stayzim.co.zw`;
  let user = await prisma.user.findUnique({ where: { email }, include: { lodge: { select: { slug: true } } } });
  if (user?.lodge) fail(`${email} already manages ${user.lodge.slug}. Remove that lodge or the login first.`);

  let password: string | null = null;
  if (!user) {
    // Same calls as create-owner: a user with a password login
    password = temporaryPassword();
    const fresh = await ctx.internalAdapter.createUser(
      { email, name: demo.owner, emailVerified: true, role: "OWNER", mustChangePassword: true },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: fresh.id,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      accountId: fresh.id,
      password: await ctx.password.hash(password),
    });
    user = { ...(await prisma.user.findUniqueOrThrow({ where: { id: fresh.id } })), lodge: null };
  }

  await prisma.lodge.create({
    data: {
      slug: demo.slug,
      name: demo.name,
      description: demo.description,
      town: demo.town,
      region: demo.region,
      latitude: demo.latitude,
      longitude: demo.longitude,
      whatsapp,
      themeColor: demo.themeColor,
      template: demo.template,
      heroHeadline: demo.heroHeadline,
      heroSubline: demo.heroSubline,
      plan: demo.plan,
      // Demos stay up: no trial to run out
      status: "ACTIVE",
      ownerId: user.id,
      rooms: { create: demo.rooms.map((room, position) => ({ ...room, position })) },
    },
  });

  created.push(demo.slug);
  console.log(`\n${demo.slug}: created ${demo.name} (${demo.plan}, ${demo.template}) with ${demo.rooms.length} rooms.`);
  console.log(`  Owner login: ${email}`);
  console.log(password ? `  Temporary password: ${password}` : "  The login already existed; its password is unchanged.");
}

if (created.length > 0) {
  console.log("\nNext: sign in as each demo owner, choose a password, and add photos in Gallery and Rooms.");
  if (!whatsapp) console.log("No --whatsapp given: the Book on WhatsApp buttons stay hidden until the owner adds a number (dashboard, My site).");
}
console.log("");
await prisma.$disconnect();
