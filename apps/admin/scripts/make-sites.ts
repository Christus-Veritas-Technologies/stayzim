/**
 * Makes a client's sites from a terminal (for the team, and for Claude): by
 * default the $15 Starter one and the $30 Growth one, as guest sites they can
 * claim later, with the same photos on each. The same as New sites in the admin
 * app, through the API with ADMIN_API_TOKEN.
 *
 *   pnpm --filter admin make-sites --name "Kudu Creek Lodge" --town Hwange \
 *     --whatsapp "+263 77 123 4567" [--contact "Their Name"] [--kind lodge|guesthouse|bnb|...] \
 *     [--plans STARTER,GROWTH] "C:/path/to/photos-folder" photo.jpg ...
 *
 *   pnpm --filter admin make-sites --check     (does the API take the token? makes nothing)
 *
 * It runs on your own machine against production (API_URL, default
 * https://api.stayzim.co.zw). The token is STAYZIM_ADMIN_TOKEN, or production's
 * from deploy/.env at the repo root (ADMIN_API_TOKEN, or the older
 * OUTREACH_PASSWORD; that file is gitignored).
 *
 * Photos: files or folders (every JPG, PNG and WebP in a folder, by name). They're
 * made smaller here first, as the admin app does in the browser: 1600px at most,
 * with 1280px and 640px copies for phones. The first is the big photo at the top.
 */
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";

const API = (process.env.API_URL ?? "https://api.stayzim.co.zw").replace(/\/$/, "");

/** The token in deploy/.env at the repo root (production's, gitignored). */
function deployToken() {
  const file = resolve(import.meta.dir, "../../../deploy/.env");
  if (!existsSync(file)) return undefined;
  const settings = new Map<string, string>();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line);
    if (match) settings.set(match[1]!, match[2]!.trim().replace(/^["']|["']$/g, ""));
  }
  return settings.get("ADMIN_API_TOKEN") || settings.get("OUTREACH_PASSWORD") || undefined;
}

/**
 * STAYZIM_ADMIN_TOKEN wins. Otherwise production's token from deploy/.env: Bun
 * loads apps/admin/.env by itself, and its ADMIN_API_TOKEN is the local one, so
 * that's only used against a local API (or when deploy/.env has none).
 */
function token() {
  if (process.env.STAYZIM_ADMIN_TOKEN) return process.env.STAYZIM_ADMIN_TOKEN;
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API);
  return local ? (process.env.ADMIN_API_TOKEN ?? deployToken()) : (deployToken() ?? process.env.ADMIN_API_TOKEN);
}

const TOKEN = token();
// Cloudflare turns away requests without a named user agent
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
    check: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!TOKEN) fail("No token: set ADMIN_API_TOKEN, or put it in deploy/.env (the same value as in Coolify).");

if (values.check) {
  const response = await fetch(`${API}/api/admin/overview`, { headers: HEADERS }).catch((error: unknown) => fail(`Can't reach ${API}: ${error}`));
  const answer = (await response.json().catch(() => ({}))) as { error?: string; leads?: number };
  if (!response.ok) {
    fail(
      response.status === 401 && answer.error === "Sign in to continue"
        ? `${API} doesn't take the token yet: redeploy it (the API needs ADMIN_API_TOKEN in its settings).`
        : `${API} said ${response.status}: ${answer.error ?? "no answer"}`,
    );
  }
  console.log(`OK: ${API} takes the token (${answer.leads ?? "?"} leads).`);
  process.exit(0);
}

if (!values.name || !values.town || !values.whatsapp) fail("Pass --name, --town and --whatsapp, then the photos (files or folders).");

/** Files as given, and every photo in a folder, by name. */
async function photoFiles(paths: string[]) {
  const files: string[] = [];
  for (const path of paths) {
    const info = await stat(path).catch(() => null);
    if (!info) fail(`No such file or folder: ${path}`);
    if (info.isDirectory()) {
      const names = (await readdir(path)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      files.push(...names.map((name) => join(path, name)));
    } else files.push(path);
  }
  return files;
}

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

// Every photo is read before anything is made, so a wrong path never leaves sites without photos
const files = await photoFiles(photos);
const prepared: Awaited<ReturnType<typeof prepare>>[] = [];
for (const path of files) {
  try {
    prepared.push(await prepare(path));
  } catch (error) {
    fail(`${path} isn't a photo we can read (${error instanceof Error ? error.message : error}).`);
  }
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
let failures = 0;
for (const photo of prepared) {
  for (const site of sites) {
    const form = new FormData();
    form.append("file", new Blob([photo.main.data], { type: "image/jpeg" }), `${photo.name}.jpg`);
    if (photo.medium) form.append("medium", new Blob([photo.medium.data], { type: "image/jpeg" }), `${photo.name}-md.jpg`);
    if (photo.small) form.append("small", new Blob([photo.small.data], { type: "image/jpeg" }), `${photo.name}-sm.jpg`);
    form.append("width", String(photo.main.info.width));
    form.append("height", String(photo.main.info.height));
    const uploaded = await fetch(`${API}/api/admin/sites/${site.slug}/photos`, { method: "POST", headers: HEADERS, body: form });
    if (!uploaded.ok) {
      failures += 1;
      const problem = (await uploaded.json().catch(() => ({}))) as { error?: string };
      console.error(`  ${photo.name} on ${site.slug}: ${problem.error ?? uploaded.status}`);
    }
  }
  console.log(`  ${photo.name}: on ${sites.length === 1 ? "the site" : `all ${sites.length} sites`}`);
}

console.log(`\nMade for lead ${body.leadId}${failures ? ` (${failures} photo uploads failed: add them from the admin)` : ""}:`);
for (const site of sites) console.log(`  ${site.plan.padEnd(7)} $${site.monthlyPrice}/month  ${site.url}`);
console.log(`\nIn the admin: /leads/${body.leadId}\n`);
