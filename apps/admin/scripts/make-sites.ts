/**
 * Makes a client's sites from a terminal (for the team, and for Claude): by
 * default the $15 Starter one and the $30 Growth one, as guest sites they can
 * claim later, with the same photos on each. The same as New sites in the admin
 * app, through the API with ADMIN_API_TOKEN.
 *
 *   ADMIN_API_TOKEN=… bun scripts/make-sites.ts --name "Kudu Creek Lodge" --town Hwange \
 *     --whatsapp "+263 77 123 4567" [--contact "Their Name"] [--kind lodge|guesthouse|bnb|…] \
 *     [--plans STARTER,GROWTH] photo1.jpg photo2.jpg …
 *
 * Photos are made smaller here first, as the admin app does in the browser: the
 * photo at 1600px at most, with 1280px and 640px copies for phones. The first one
 * is the big photo at the top of the site. API_URL defaults to production.
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";

const API = (process.env.API_URL ?? "https://api.stayzim.co.zw").replace(/\/$/, "");
const TOKEN = process.env.ADMIN_API_TOKEN;
// Cloudflare turns away requests without a browser-like or named user agent
const HEADERS = { Authorization: `Bearer ${TOKEN}`, "User-Agent": "StayZim-admin-script/1.0" };

const { values, positionals: photos } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string" },
    town: { type: "string" },
    whatsapp: { type: "string" },
    contact: { type: "string" },
    email: { type: "string" },
    kind: { type: "string" },
    plans: { type: "string", default: "STARTER,GROWTH" },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!TOKEN) fail("Set ADMIN_API_TOKEN (the same as in Coolify).");
if (!values.name || !values.town || !values.whatsapp) fail("Pass --name, --town and --whatsapp, then the photos.");

type Site = { slug: string; plan: string; monthlyPrice: number; url: string };

/** A photo and its smaller copies, as JPEGs, turned the right way up. */
async function prepare(path: string) {
  const source = await readFile(path);
  const resize = (edge: number, quality: number) =>
    sharp(source).rotate().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const main = await resize(1600, 82);
  const longest = Math.max(main.info.width, main.info.height);
  return {
    name: basename(path).replace(/\.[^.]+$/, "") || "photo",
    main,
    medium: longest > 1280 ? await resize(1280, 80) : null,
    small: longest > 640 ? await resize(640, 78) : null,
  };
}

const made = await fetch(`${API}/api/admin/sites`, {
  method: "POST",
  headers: { ...HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: values.name,
    town: values.town,
    whatsapp: values.whatsapp,
    contactName: values.contact,
    email: values.email,
    kind: values.kind,
    plans: values.plans!.split(",").map((plan) => plan.trim().toUpperCase()),
  }),
});
const body = (await made.json().catch(() => ({}))) as { leadId?: string; sites?: Site[]; error?: string };
if (!made.ok || !body.sites) fail(`The sites weren't made (${made.status}): ${body.error ?? "no answer"}`);

const sites = body.sites;
for (const path of photos) {
  let photo: Awaited<ReturnType<typeof prepare>>;
  try {
    photo = await prepare(path);
  } catch (error) {
    console.error(`  ${path}: not a photo we can read (${error instanceof Error ? error.message : error})`);
    continue;
  }
  for (const site of sites) {
    const form = new FormData();
    form.append("file", new Blob([photo.main.data], { type: "image/jpeg" }), `${photo.name}.jpg`);
    if (photo.medium) form.append("medium", new Blob([photo.medium.data], { type: "image/jpeg" }), `${photo.name}-md.jpg`);
    if (photo.small) form.append("small", new Blob([photo.small.data], { type: "image/jpeg" }), `${photo.name}-sm.jpg`);
    form.append("width", String(photo.main.info.width));
    form.append("height", String(photo.main.info.height));
    const uploaded = await fetch(`${API}/api/admin/sites/${site.slug}/photos`, { method: "POST", headers: HEADERS, body: form });
    if (!uploaded.ok) {
      const problem = (await uploaded.json().catch(() => ({}))) as { error?: string };
      console.error(`  ${basename(path)} on ${site.slug}: ${problem.error ?? uploaded.status}`);
    }
  }
  console.log(`  ${basename(path)}: on ${sites.length === 1 ? "the site" : `all ${sites.length} sites`}`);
}

console.log(`\nMade for lead ${body.leadId}:`);
for (const site of sites) console.log(`  ${site.plan.padEnd(7)} $${site.monthlyPrice}/month  ${site.url}`);
console.log(`\nAdmin: the lead's page, /leads/${body.leadId}\n`);
