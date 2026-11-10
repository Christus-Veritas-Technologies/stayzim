/**
 * The sales agent changing a lead's sites in the chat (view_site, edit_site),
 * against the local API: a street address, two WhatsApp numbers and rates
 * priced by the stay ("Short rest $15 for 3 hours") on both of their options;
 * one price changed by a room id from the first site only (each site has its
 * own ids); a room with no price changes nothing anywhere; and the public site
 * shows it all, with the rates never booked by the night.
 *
 *   bun scripts/agent-site-edit-check.ts   (the local API running, with ADMIN_API_TOKEN)
 */
import prisma from "@stayzim/db";

const box = globalThis as Record<string, unknown>;
const fake = (id: string) => ({ id, isReady: true, replyInChat: async () => "fake", send: async () => ({ sent: true }), setChatLabel: async () => "set" as const, getStatus: () => ({ id, state: "ready" }) });
box.__stayzimWhatsApp = { accounts: new Map([["wa1", fake("wa1")], ["wa3", fake("wa3")]]), nextIndex: 0, started: true };

const { runTool } = await import("../src/server/agent/tools");
const { serverApi } = await import("../src/server/agent/server-api");
const { phoneForSite } = await import("../src/server/agent/site-edit");
type ToolContext = import("../src/server/agent/tools").ToolContext;

const results: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail && !ok ? `: ${detail}` : ""}`);
};

check("local numbers become the full number", phoneForSite("0774788803") === "263774788803" && phoneForSite("+263 71 284 7109") === "263712847109" && phoneForSite("774788803") === "263774788803" && phoneForSite("+2630712847109") === "263712847109");

// A lead with two options, made the way make_sites makes them
const stamp = Date.now().toString().slice(-6);
const made = await serverApi.makeSites({ name: `Timmy Check ${stamp}`, town: "Msasa Park, Harare", whatsapp: `2637712${stamp.slice(0, 5)}`, plans: ["STARTER", "GROWTH"], previewDays: 2 });
const contactId = made.leadId;
const logged: { kind: string; data: Record<string, unknown> }[] = [];
const ctx: ToolContext = { contactId, chatId: "check@c.us", account: "wa1", send: async () => {}, log: async (kind, data) => void logged.push({ kind, data }) };

const before = await runTool("view_site", {}, ctx);
check("view_site shows both sites, with example rooms", before.includes("Site 1") && before.includes("Site 2") && before.includes("none yet"), before);

const rates = [
  { name: "Short rest", price: 15, price_label: "3 hours" },
  { name: "Day rest", price: 20, price_label: "9am to 4pm" },
  { name: "Overnight", price: 15, price_label: "6pm to 9am" },
  { name: "Overnight", price: 20, price_label: "8pm to 9am" },
];
const edited = await runTool("edit_site", { address: "1 Faurea Crescent, Msasa Park, Harare", whatsapp: "0774788803", second_whatsapp: "0712847109", rooms: rates }, ctx);
console.log(`\n${edited}\n`);
check("edit_site saves on both options", edited.startsWith("Saved on all 2 of their sites"), edited);
check("and reads back the rates as guests see them", edited.includes("Short rest: $15 · 3 hours") && edited.includes("Overnight: $20 · 8pm to 9am") && edited.includes("+263 71 284 7109"), edited);

const lodges = await prisma.lodge.findMany({ where: { leadId: contactId }, include: { rooms: { orderBy: { position: "asc" } } }, orderBy: { plan: "asc" } });
check(
  "both sites: the address and both numbers",
  lodges.length === 2 && lodges.every((lodge) => lodge.address === "1 Faurea Crescent, Msasa Park, Harare" && lodge.whatsapp === "263774788803" && lodge.whatsapp2 === "263712847109"),
  JSON.stringify(lodges.map(({ address, whatsapp, whatsapp2 }) => ({ address, whatsapp, whatsapp2 }))),
);
check(
  "both sites: the four rates, in order, as they wrote them",
  lodges.every((lodge) => JSON.stringify(lodge.rooms.map((room) => [room.name, room.price, room.priceLabel])) === JSON.stringify(rates.map((rate) => [rate.name, rate.price, rate.price_label]))),
);

// A change by the first site's room id: the second site's own room changes too
const starter = lodges.find((lodge) => lodge.plan === "STARTER")!;
const growth = lodges.find((lodge) => lodge.plan === "GROWTH")!;
const ids = starter.rooms.map((room) => room.id);
await runTool("edit_site", { rooms: starter.rooms.map((room) => ({ id: room.id, ...(room.name === "Day rest" ? { price: 25 } : {}) })) }, ctx);
const after = await prisma.lodge.findMany({ where: { leadId: contactId }, include: { rooms: { orderBy: { position: "asc" } } } });
const dayRest = (lodgeId: string) => after.find((lodge) => lodge.id === lodgeId)!.rooms.find((room) => room.name === "Day rest");
check("a price changed by id on the first site", dayRest(starter.id)?.price === 25 && dayRest(starter.id)?.priceLabel === "9am to 4pm");
check("and on the second site by the same room's name", dayRest(growth.id)?.price === 25 && after.find((lodge) => lodge.id === growth.id)!.rooms.length === 4);
check("rooms that stay keep their ids", JSON.stringify(after.find((lodge) => lodge.id === starter.id)!.rooms.map((room) => room.id)) === JSON.stringify(ids));

// A room with no price: nothing changes anywhere
const refused = await runTool("edit_site", { address: "Somewhere else", rooms: [{ name: "Suite" }] }, ctx);
const unchanged = await prisma.lodge.findMany({ where: { leadId: contactId }, select: { address: true, _count: { select: { rooms: true } } } });
check("a room with no price changes nothing", refused.startsWith("Nothing changed") && unchanged.every((lodge) => lodge.address === "1 Faurea Crescent, Msasa Park, Harare" && lodge._count.rooms === 4), refused);

// A bad number: the API's own message, nothing saved
const badNumber = await runTool("edit_site", { second_whatsapp: "12" }, ctx);
check("a bad number is refused with the reason", badNumber.includes("NOT changed") && badNumber.includes("Nothing was saved"), badNumber);

// Removing the second number
await runTool("edit_site", { option: 1, second_whatsapp: "" }, ctx);
const removed = await prisma.lodge.findMany({ where: { leadId: contactId }, select: { plan: true, whatsapp2: true } });
check("\"\" removes a field, on the option named only", removed.find((lodge) => lodge.plan === "STARTER")?.whatsapp2 === null && removed.find((lodge) => lodge.plan === "GROWTH")?.whatsapp2 === "263712847109");

// The public site
const api = (process.env.SERVER_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:9998").replace(/\/$/, "");
const site = (await (await fetch(`${api}/api/sites/${growth.slug}`)).json()) as { address: string | null; whatsapp2: string | null; booking: { mode: string }; rooms: { name: string; priceLabel: string | null; sample: boolean }[]; copy: { rooms: { intro: string } } };
check("the public site has the address, second number and rates", site.address === "1 Faurea Crescent, Msasa Park, Harare" && site.whatsapp2 === "263712847109" && site.rooms.length === 4 && site.rooms.every((room) => room.priceLabel && !room.sample));
check("a Growth site of rates only doesn't take bookings by the night", site.booking.mode === "whatsapp", site.booking.mode);
check("the log records the edits", logged.some((entry) => entry.kind === "tool" && entry.data.tool === "edit_site"));

// Tidy up: the check's lead and sites (KEEP=1 leaves them, to look at)
if (process.env.KEEP) console.log(`\nKept: ${lodges.map((lodge) => lodge.slug).join(", ")}`);
else for (const lodge of lodges) await fetch(`${api}/api/admin/sites/${lodge.slug}`, { method: "DELETE", headers: { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` } });
if (!process.env.KEEP) await prisma.contact.delete({ where: { id: contactId } }).catch(() => {});

console.log(`\n${results.filter((result) => result.ok).length}/${results.length} passed`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
