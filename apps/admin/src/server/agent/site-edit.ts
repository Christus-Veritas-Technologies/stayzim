import prisma from "@stayzim/db";
import { pricePer, type DashboardLodge } from "@stayzim/sites";

import { siteUrl } from "@/lib/site-url";

import { ApiError, serverApi, type SiteRoomInput } from "./server-api";

/**
 * Changes to a lead's or customer's site that they ask for in the chat (their
 * real rooms and prices, the address, numbers, check-in times): the agent
 * reads the site (view_site), sends exactly the change (edit_site), and gets
 * back what the site now says, to tell them.
 */

type Args = Record<string, unknown>;

/** The sites a change is for: the one named, else the one they chose (or paid for), else all of theirs */
export async function sitesToEdit(contactId: string, option?: number) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId }, select: { chosenSiteId: true } });
  const plans = ["STARTER", "GROWTH", "PRO"];
  const sites = (await prisma.lodge.findMany({ where: { leadId: contactId }, select: { id: true, slug: true, plan: true } }))
    .sort((a, b) => plans.indexOf(a.plan) - plans.indexOf(b.plan))
    .map((site, index) => ({ ...site, option: index + 1 }));
  if (option !== undefined) return sites.filter((site) => site.option === option);
  const chosen = sites.find((site) => site.id === contact.chosenSiteId);
  return chosen ? [chosen] : sites;
}

/** "0774788803", "+263 77 478 8803", "774788803" → "263774788803"; other countries as typed, digits only */
export function phoneForSite(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0[1-9]\d{8}$/.test(digits)) return `263${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits)) return `263${digits}`;
  if (/^2630\d{9}$/.test(digits)) return `263${digits.slice(4)}`;
  return digits;
}

const formatPhone = (digits: string | null) => {
  if (!digits) return null;
  const zw = digits.match(/^263(\d{2})(\d{3})(\d{4})$/);
  return zw ? `+263 ${zw[1]} ${zw[2]} ${zw[3]}` : `+${digits}`;
};

/** A room as guests see its price: "Short rest: $15 · 3 hours", "Garden Room: $60 / night" */
export function roomLine(room: { name: string; price: number; priceLabel: string | null }) {
  return `${room.name}: $${room.price} ${pricePer(room)}`;
}

/** What's on a site, compactly, for the model (room ids so a change keeps the rooms that stay) */
export function describeSite(site: DashboardLodge, option: number, url: string) {
  const value = (text: string | null | undefined) => (text?.trim() ? text.trim() : "not set");
  const lines = [
    `Site ${option} (${site.plan}, ${url}):`,
    `- Name: ${site.name} · Town: ${value(site.town)} · Street address: ${value(site.address)}`,
    `- WhatsApp (Book buttons): ${value(formatPhone(site.whatsapp))} · Second WhatsApp: ${value(formatPhone(site.whatsapp2))} · Phone for calls: ${value(formatPhone(site.phone))} · Email: ${value(site.email)}`,
    `- Map pin: ${site.latitude !== null ? "set" : site.mapsUrl ? "link saved, no pin" : "not set"}`,
    `- Description: ${value(site.description)}`,
    `- Check-in from: ${value(site.checkInFrom)} · Check-out by: ${value(site.checkOutBy)} · House rules: ${site.houseRules.length ? site.houseRules.join("; ") : "none"} · Cancellation: ${value(site.cancellationPolicy)}`,
    site.rooms.length
      ? `- Rooms, in order: ${site.rooms
          .map((room) => `[id ${room.id}] ${roomLine(room)}, sleeps ${room.sleeps}${room.beds ? `, ${room.beds}` : ""}${room.units > 1 ? `, ${room.units} of them` : ""}${room.visible ? "" : " (hidden)"}${room.photos.length ? `, ${room.photos.length} photo${room.photos.length === 1 ? "" : "s"}` : ""}`)
          .join(" | ")}`
      : "- Rooms: none yet (the site shows example rooms until their real ones go in)",
  ];
  return lines.join("\n");
}

const has = (args: Args, key: string) => args[key] !== undefined && args[key] !== null;
/** A text field: "" clears it */
const textOrNull = (value: unknown) => (typeof value === "string" ? value.trim() || null : null);

const DETAIL_FIELDS: Record<string, (value: unknown) => [string, unknown]> = {
  name: (value) => ["name", String(value).trim()],
  town: (value) => ["town", textOrNull(value)],
  address: (value) => ["address", textOrNull(value)],
  whatsapp: (value) => ["whatsapp", textOrNull(value) ? phoneForSite(String(value)) : null],
  second_whatsapp: (value) => ["whatsapp2", textOrNull(value) ? phoneForSite(String(value)) : null],
  phone: (value) => ["phone", textOrNull(value) ? phoneForSite(String(value)) : null],
  email: (value) => ["email", textOrNull(value)?.toLowerCase() ?? null],
  description: (value) => ["description", String(value).trim()],
  maps_link: (value) => ["mapsUrl", textOrNull(value)],
  check_in_from: (value) => ["checkInFrom", textOrNull(value)],
  check_out_by: (value) => ["checkOutBy", textOrNull(value)],
  house_rules: (value) => ["houseRules", Array.isArray(value) ? value.map((rule) => String(rule).trim()).filter(Boolean) : []],
  cancellation_policy: (value) => ["cancellationPolicy", textOrNull(value)],
  headline: (value) => ["heroHeadline", textOrNull(value)],
  subline: (value) => ["heroSubline", textOrNull(value)],
};

/** The details part of an edit_site call, as PATCH /api/admin/sites/:slug/content takes it */
export function detailsPatch(args: Args) {
  const patch: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(DETAIL_FIELDS)) {
    if (!has(args, key)) continue;
    const [name, value] = field(args[key]);
    patch[name] = value;
  }
  // A cleared map link takes its pin with it
  if (patch.mapsUrl === null) Object.assign(patch, { latitude: null, longitude: null });
  return patch;
}

type RoomArg = { id?: unknown; name?: unknown; price?: unknown; price_label?: unknown; sleeps?: unknown; beds?: unknown; description?: unknown; units?: unknown; visible?: unknown };

/**
 * The rooms part: the full list as it should be. A room with an id starts from
 * what it has (amenities, description, size stay unless changed); a new one
 * from the defaults. Problems come back in words, and nothing is sent.
 * `others` (their other sites' rooms) matches an id from another of their
 * sites to this site's room of the same name: each site has its own ids.
 */
export function roomsList(rooms: unknown, current: DashboardLodge["rooms"], others: DashboardLodge["rooms"] = []): { rooms: SiteRoomInput[] } | { problem: string } {
  if (!Array.isArray(rooms)) return { problem: "rooms must be a list" };
  const out: SiteRoomInput[] = [];
  /** This site's rooms already matched (two rooms can share a name: "Overnight" 6pm and 8pm) */
  const claimed = new Set<string>();
  for (const [index, raw] of (rooms as RoomArg[]).entries()) {
    const given = typeof raw.id === "string" && raw.id ? raw.id : undefined;
    const elsewhere = given && !current.some((room) => room.id === given) ? others.find((room) => room.id === given) : undefined;
    if (given && !elsewhere && !current.some((room) => room.id === given)) return { problem: `room ${index + 1}: there's no room with id ${given} (call view_site for the ids)` };
    // This site's own room: by id, or the next not yet matched with the other site's room's name
    const existing = current.find((room) => room.id === given) ?? (elsewhere ? current.find((room) => room.name === elsewhere.name && !claimed.has(room.id)) : undefined);
    if (existing && claimed.has(existing.id)) return { problem: `room ${index + 1}: ${existing.name} is listed twice` };
    if (existing) claimed.add(existing.id);
    const id = existing?.id;
    const template = existing ?? elsewhere;
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : template?.name;
    if (!name) return { problem: `room ${index + 1} needs a name` };
    const price = raw.price === undefined ? template?.price : Number(raw.price);
    if (price === undefined || !Number.isInteger(price) || price < 1) return { problem: `${name} needs a price in whole dollars (if they said it, use it exactly; if not, ask)` };
    out.push({
      ...(id ? { id } : {}),
      name,
      price,
      priceLabel: raw.price_label === undefined ? (template?.priceLabel ?? null) : textOrNull(raw.price_label),
      sleeps: raw.sleeps === undefined ? (template?.sleeps ?? 2) : Math.max(1, Math.round(Number(raw.sleeps)) || 1),
      amenities: template?.amenities ?? [],
      units: raw.units === undefined ? (template?.units ?? 1) : Math.max(1, Math.round(Number(raw.units)) || 1),
      visible: raw.visible === undefined ? (template?.visible ?? true) : raw.visible !== false,
      description: raw.description === undefined ? (template?.description ?? null) : textOrNull(raw.description),
      beds: raw.beds === undefined ? (template?.beds ?? null) : textOrNull(raw.beds),
      size: template?.size ?? null,
    });
  }
  return { rooms: out };
}

/** view_site: what's on their site(s) now */
export async function viewSites(contactId: string, option?: number) {
  const sites = await sitesToEdit(contactId, option);
  if (!sites.length) return option ? `They have no site ${option}.` : "They have no site yet.";
  const described = await Promise.all(
    sites.map(async (site) => {
      const content = await serverApi.siteContent(site.slug);
      return describeSite(content, site.option, siteUrl(content));
    }),
  );
  return described.join("\n\n");
}

/** edit_site: applies the change to their site(s) and says exactly what the site now says */
export async function editSites(contactId: string, args: Args, log: (kind: string, data: Record<string, unknown>) => Promise<void>) {
  const option = typeof args.option === "number" ? args.option : undefined;
  const sites = await sitesToEdit(contactId, option);
  if (!sites.length) return option ? `They have no site ${option}: nothing changed.` : "They have no site yet: nothing changed. Make their sites first.";
  const patch = detailsPatch(args);
  const wantsRooms = args.rooms !== undefined;
  if (!Object.keys(patch).length && !wantsRooms) return "Nothing to change: pass the fields they asked to change.";

  // Everything is checked before anything is saved: a problem changes nothing on any site
  const contents = await Promise.all(sites.map((site) => serverApi.siteContent(site.slug)));
  const lists: (SiteRoomInput[] | null)[] = [];
  for (const [index, content] of contents.entries()) {
    if (!wantsRooms) {
      lists.push(null);
      continue;
    }
    const others = contents.filter((_, other) => other !== index).flatMap((site) => site.rooms);
    const list = roomsList(args.rooms, content.rooms, others);
    if ("problem" in list) return `Nothing changed: ${list.problem}.`;
    lists.push(list.rooms);
  }

  const results: string[] = [];
  const changed: string[] = [];
  for (const [index, site] of sites.entries()) {
    try {
      let content = contents[index]!;
      if (Object.keys(patch).length) content = await serverApi.editSite(site.slug, patch);
      const rooms = lists[index];
      if (rooms) content = await serverApi.setRooms(site.slug, rooms);
      changed.push(site.slug);
      results.push(describeSite(content, site.option, siteUrl(content)));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      await log("error", { step: "edit_site", site: site.slug, error: message });
      results.push(`Site ${site.option}: NOT changed (${message}).`);
    }
  }
  if (changed.length) await log("tool", { tool: "edit_site", sites: changed, fields: Object.keys(patch), rooms: wantsRooms });
  return `${changed.length ? `Saved on ${changed.length === sites.length ? (sites.length > 1 ? `all ${sites.length} of their sites` : "their site") : `${changed.length} of ${sites.length} sites`}; it's live now.` : "Nothing was saved."} The site now says:\n\n${results.join("\n\n")}\n\nTell them what changed, in a few short lines, exactly as above (names, prices, numbers), with the link to see it. Don't repeat what didn't change.`;
}
