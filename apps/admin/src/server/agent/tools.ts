import prisma from "@stayzim/db";
import { DEMO_DAYS, demoEnded, foundingOpen, LODGE_KIND_KEYS, monthlyPrice, type Plan } from "@stayzim/sites";
import sharp from "sharp";

import { siteUrl } from "@/lib/site-url";

import { alertKin } from "./alerts";
import type { ToolDefinition } from "./openrouter";
import { checkPayment, latestPaymentWatch, watchPayment } from "./payments";
import { ApiError, serverApi } from "./server-api";
import { editSites, viewSites } from "./site-edit";
import { handoverMessage, linkInsteadMessage, localDigits, payLinkMessage, promptSentMessage, siteOptionsMessage, walletFor } from "./templates";

/**
 * The agent's tools. Each one does a step of the sales flow and moves the
 * lead's stage on; anything with prices, links or payments goes through the
 * fixed templates, never the model's own words.
 */

export type AgentFacts = {
  kind?: string | null;
  rooms?: number | null;
  /** They told us their name (not just their WhatsApp profile's) */
  nameGiven?: boolean;
};

/** Their name, only when they gave it (or came from a form or a list); never a WhatsApp profile name */
export function givenName(contact: { name: string; phone: string; source: string | null; qualification: unknown }) {
  if (contact.source === "whatsapp" && !readFacts(contact.qualification).nameGiven) return null;
  return contact.name && contact.name !== contact.phone && !contact.name.startsWith("+") ? contact.name : null;
}

/** What a tool can use: the lead, sending in their chat, and the log. */
export type ToolContext = {
  contactId: string;
  chatId: string;
  account: string;
  /** Sends a message in their chat (typing first), and records it */
  send: (text: string) => Promise<void>;
  log: (kind: string, data: Record<string, unknown>, costUsd?: number) => Promise<void>;
  /** Set by stay_silent: no reply this turn */
  silent?: string;
  /** Set when a tool sent the turn's message itself (a payment prompt or link): nothing more is sent */
  done?: boolean;
  /** Set by label_lead: the agent's call on whether they're a prospect (for the ads' labels) */
  label?: "qualified" | "unqualified";
};

const PLAN_ORDER: Plan[] = ["STARTER", "GROWTH", "PRO"];

/** The lead's sites, numbered as in the options message (by plan). */
export async function leadSites(contactId: string) {
  const sites = await prisma.lodge.findMany({
    where: { leadId: contactId },
    select: { id: true, slug: true, customDomain: true, plan: true, founding: true, status: true, demoEndsAt: true },
  });
  return sites
    .sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan))
    .map((site, index) => ({ ...site, option: index + 1, url: siteUrl(site), monthlyPrice: monthlyPrice(site.plan, site.founding) }));
}

/**
 * Their free previews that ended (offline now) back online for another
 * DEMO_DAYS, so the links we send or they open work. Returns the slugs reopened.
 */
export async function reopenEndedPreviews(sites: Awaited<ReturnType<typeof leadSites>>, log: ToolContext["log"]) {
  const now = new Date();
  const reopened: string[] = [];
  for (const site of sites.filter((candidate) => demoEnded(candidate, now))) {
    try {
      await serverApi.extendPreview(site.slug, DEMO_DAYS);
      reopened.push(site.slug);
    } catch (error) {
      await log("error", { step: "reopen preview", site: site.slug, error: String(error) });
    }
  }
  if (reopened.length) await log("tool", { tool: "reopen_previews", sites: reopened, days: DEMO_DAYS });
  return reopened;
}

/**
 * The payment link for the site they chose: the one already sent for the same
 * months while it still works (so one link, one amount, is out there, and a
 * second prompt lands on the link we're watching), else a new one.
 */
export async function payLinkFor(contactId: string, slug: string, months: number) {
  const last = await prisma.agentEvent.findFirst({ where: { contactId, kind: { in: ["payment", "payment_link"] } }, orderBy: { createdAt: "desc" } });
  const data = last?.data as { token?: string; slug?: string } | undefined;
  if (data?.token && data.slug === slug) {
    const status = await serverApi.linkStatus(data.token).catch(() => null);
    if (status?.link.state === "open" && status.link.months === months) return { token: data.token, url: status.link.url, amountCents: status.link.amountCents };
  }
  const link = await serverApi.paymentLink(slug, months);
  return { token: link.url.split("/").pop()!, url: link.url, amountCents: link.amountCents };
}

/** The facts the agent saved (kind of place, rooms), kept with the qualification. */
export function readFacts(qualification: unknown): AgentFacts {
  return ((qualification as { facts?: AgentFacts } | null)?.facts ?? {}) as AgentFacts;
}

export const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "save_details",
      description: "Save what they told you about themselves and their place, as soon as they say it. Only the fields you learned.",
      parameters: {
        type: "object",
        properties: {
          lodge_name: { type: "string", description: "Their place's name, as they write it" },
          city: { type: "string", description: "The town or city it's in" },
          email: { type: "string", description: "The email to put the site under" },
          their_name: { type: "string", description: "Their own name, only if they told you" },
          kind: { type: "string", enum: LODGE_KIND_KEYS },
          rooms: { type: "integer", description: "How many rooms or properties they have" },
          note: { type: "string", description: "Anything else worth remembering, in a few words" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "make_sites",
      description:
        "Build their sites from the photos they sent (the $15 and $30 ones, and the top one for big places) and send them the options with links and prices. Call once you have their place's name, town and at least one photo (3 or more is better).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "send_options_again",
      description:
        "Send their sites' options message again (links and prices), when they lost it, ask to see the options again, or say a link doesn't open. Previews that ended come back online for 2 more days first.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "choose_site",
      description: "Record which of their sites they picked: 1, 2 or 3 as in the options message.",
      parameters: { type: "object", properties: { option: { type: "integer", enum: [1, 2, 3] } }, required: ["option"] },
    },
  },
  {
    type: "function",
    function: {
      name: "start_ecocash",
      description:
        "Send a payment prompt for the site they chose to this number (1 month, or 3 or 12 ahead if they asked): EcoCash for 077/078, OneMoney for 071. It sends the message telling them to enter their PIN, and confirms in the chat on its own when it's paid. A number that can't get a prompt, or a prompt Paynow can't send, gets the payment link instead, automatically. Also for 'send it again'.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "The EcoCash number, e.g. 0771234567" },
          months: { type: "integer", enum: [1, 3, 12], description: "How many months they pay for (default 1)" },
        },
        required: ["phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_payment_link",
      description: "Send a link to pay by EcoCash, OneMoney, InnBucks or card (when they'd rather not get a prompt, or ask for a link). Confirms in the chat on its own when it's paid.",
      parameters: { type: "object", properties: { months: { type: "integer", enum: [1, 3, 12], description: "How many months they pay for (default 1)" } } },
    },
  },
  {
    type: "function",
    function: { name: "check_payment", description: "Ask Paynow now how their payment is going (when they say they've paid, or ask). If it went through, their confirmation is sent right away.", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function",
    function: {
      name: "view_site",
      description: "See what their site says now: name, town, street address, WhatsApp and phone numbers, email, description, check-in times, house rules, and every room with its id and price. Call it before edit_site.",
      parameters: { type: "object", properties: { option: { type: "integer", enum: [1, 2, 3], description: "Only this one of their sites (default: the one they chose, else all)" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_site",
      description:
        "Change their site when they ask: their real rooms and prices, the street address, town, name, WhatsApp or phone numbers, email, description, map link, check-in and check-out times, house rules. Pass only what they asked to change, in their words; \"\" removes a field. It saves on the site they chose (or all their options before they choose), checks it, and returns exactly what the site now says.",
      parameters: {
        type: "object",
        properties: {
          option: { type: "integer", enum: [1, 2, 3], description: "Only this one of their sites, if they named one" },
          name: { type: "string", description: "Their place's name" },
          town: { type: "string", description: "Town or area, e.g. \"Msasa Park, Harare\"" },
          address: { type: "string", description: "Street address, e.g. \"1 Faurea Crescent, Msasa Park, Harare\"" },
          whatsapp: { type: "string", description: "The WhatsApp number every Book button opens, e.g. 0774788803" },
          second_whatsapp: { type: "string", description: "Another WhatsApp number, shown beside the first" },
          phone: { type: "string", description: "A number for calls" },
          email: { type: "string" },
          description: { type: "string", description: "The short intro, up to 300 characters, only if they wrote or asked for it" },
          maps_link: { type: "string", description: "A Google Maps link they sent (its pin is read)" },
          check_in_from: { type: "string", description: "24-hour time on the half hour, e.g. \"14:00\"" },
          check_out_by: { type: "string", description: "24-hour time on the half hour, e.g. \"10:00\"" },
          house_rules: { type: "array", items: { type: "string" }, description: "Every rule, as it should be (replaces the list)" },
          cancellation_policy: { type: "string" },
          headline: { type: "string", description: "The big line at the top, only if they asked" },
          subline: { type: "string", description: "The line under it, only if they asked" },
          rooms: {
            type: "array",
            description:
              "EVERY room as it should be after the change, in order: it replaces the list (and the example rooms). Keep the id (from view_site) of each room that stays; leave id out for a new one.",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", description: "As they call it: \"Short rest\", \"Deluxe Double\"" },
                price: { type: "integer", description: "Whole US dollars" },
                price_label: { type: "string", description: "Only when the price isn't for a night: what it's for, e.g. \"3 hours\", \"9am to 4pm\", \"6pm to 9am\". Leave out for a night." },
                sleeps: { type: "integer", description: "Most guests (default 2)" },
                beds: { type: "string", description: "e.g. \"1 queen bed\"" },
                description: { type: "string" },
                units: { type: "integer", description: "How many of this room they have (default 1)" },
              },
              required: ["name", "price"],
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hand_over",
      description: "Hand the chat to Kin (discounts, cash or bank transfer, repeated payment failures, upset, asks for a person or a call, anything you can't answer). Sends them a short message that Kin will reply.",
      parameters: { type: "object", properties: { reason: { type: "string", description: "Why, in a few words, for Kin" } }, required: ["reason"] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_in_later",
      description: "Schedule one check-in message when a new lead isn't ready yet (renovating, travelling, 'end of the month'). You still reply this turn, briefly and warmly, with no question.",
      parameters: { type: "object", properties: { days: { type: "integer", description: "In how many days (they said when; a week if not)" } }, required: ["days"] },
    },
  },
  {
    type: "function",
    function: {
      name: "label_lead",
      description:
        "Label this chat for our ads, only when you're sure: qualified (they clearly run a place to stay and are seriously engaged) or unqualified (clearly not for us). When unsure, don't call it.",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string", enum: ["qualified", "unqualified"] },
          why: { type: "string", description: "A few words, for the log" },
        },
        required: ["label", "why"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "stay_silent",
      description: "Don't reply this time (their messages are still read).",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", enum: ["not_interested", "will_get_back", "conversation_over", "low_quality", "not_a_fit"] },
          follow_up_days: { type: "integer", description: "For will_get_back: when they said they'd come back, in days (default 7)" },
        },
        required: ["reason"],
      },
    },
  },
];

/** Photos they sent, not used for a site yet, oldest first (the first becomes the big photo) */
async function unusedPhotos(contactId: string) {
  return prisma.inboundMedia.findMany({
    where: { usedAt: null, inboundMessage: { contactId } },
    orderBy: { createdAt: "asc" },
    take: 12,
    select: { id: true, data: true },
  });
}

/** A photo and its smaller copies, as the site expects them (as the admin's browser makes them) */
async function preparePhoto(data: Uint8Array) {
  const resize = (edge: number, quality: number) =>
    sharp(data).rotate().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const main = await resize(1600, 82);
  const longest = Math.max(main.info.width, main.info.height);
  return { main, medium: longest > 1280 ? await resize(1280, 80) : null, small: longest > 640 ? await resize(640, 78) : null };
}

/** A fresh form for one upload (a FormData can only be sent once) */
function photoForm(photo: Awaited<ReturnType<typeof preparePhoto>>, name: string) {
  const jpeg = (data: Buffer) => new Blob([new Uint8Array(data)], { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", jpeg(photo.main.data), `${name}.jpg`);
  if (photo.medium) form.append("medium", jpeg(photo.medium.data), `${name}-md.jpg`);
  if (photo.small) form.append("small", jpeg(photo.small.data), `${name}-sm.jpg`);
  form.append("width", String(photo.main.info.width));
  form.append("height", String(photo.main.info.height));
  return form;
}

/**
 * Photos they sent after their sites were made: added to every one of their
 * sites (not yet handed over), so nothing they send is lost. Returns how many.
 */
export async function addNewPhotosToSites(contactId: string, log: ToolContext["log"]) {
  const sites = await leadSites(contactId);
  if (!sites.length) return 0;
  const photos = await unusedPhotos(contactId);
  let added = 0;
  for (const [index, photo] of photos.entries()) {
    const prepared = await preparePhoto(photo.data).catch(() => null);
    if (!prepared) continue;
    for (const site of sites) {
      await serverApi.uploadPhoto(site.slug, photoForm(prepared, `photo-more-${index + 1}`)).catch((error: unknown) => log("error", { step: "add photos", site: site.slug, error: String(error) }));
    }
    added += 1;
  }
  if (photos.length) await prisma.inboundMedia.updateMany({ where: { id: { in: photos.map((photo) => photo.id) } }, data: { usedAt: new Date() } });
  if (added) await log("tool", { tool: "add_photos", added });
  return added;
}

type Args = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** Runs one tool call; the result goes back to the model. */
export async function runTool(name: string, args: Args, ctx: ToolContext): Promise<string> {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: ctx.contactId } });
  const facts = readFacts(contact.qualification);

  switch (name) {
    case "save_details": {
      const rooms = typeof args.rooms === "number" && args.rooms > 0 ? Math.round(args.rooms) : undefined;
      const kind = text(args.kind) && (LODGE_KIND_KEYS as readonly string[]).includes(String(args.kind)) ? String(args.kind) : undefined;
      const note = text(args.note);
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          ...(text(args.lodge_name) ? { lodgeName: text(args.lodge_name) } : {}),
          ...(text(args.city) ? { city: text(args.city) } : {}),
          ...(text(args.email) ? { email: text(args.email)!.toLowerCase() } : {}),
          ...(text(args.their_name) ? { name: text(args.their_name) } : {}),
          ...(note ? { notes: [contact.notes, note].filter(Boolean).join("\n") } : {}),
          ...(kind || rooms || text(args.their_name)
            ? {
                qualification: {
                  ...((contact.qualification as object | null) ?? {}),
                  facts: { ...facts, ...(kind ? { kind } : {}), ...(rooms ? { rooms } : {}), ...(text(args.their_name) ? { nameGiven: true } : {}) },
                },
              }
            : {}),
          ...(contact.agentStage === "NEW" ? { agentStage: "DETAILS" } : {}),
        },
      });
      const fresh = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
      const photos = await prisma.inboundMedia.count({ where: { inboundMessage: { contactId: contact.id } } });
      const built = (await leadSites(contact.id)).length > 0;
      if (built) return "Saved.";
      const missing = [!fresh.lodgeName && "their place's name", !fresh.city && "the town", photos < 1 && "at least one photo"].filter(Boolean);
      return missing.length
        ? `Saved. Before building their sites you still need: ${missing.join(", ")}.`
        : `Saved. You can build their sites now (make_sites)${photos < 3 ? `; they've sent ${photos} photo${photos === 1 ? "" : "s"}, so wait a moment if they're still sending` : ""}.`;
    }

    case "make_sites": {
      if (!contact.lodgeName || !contact.city) return "Can't yet: you need their place's name and town first.";
      if (!(await prisma.inboundMedia.count({ where: { inboundMessage: { contactId: contact.id } } }))) return "Can't yet: they haven't sent a photo. Ask for a few (even one is enough to start).";
      const existing = await leadSites(contact.id);
      if (existing.length) return "Their sites are already made and were sent to them. Don't make more.";
      const photos = await unusedPhotos(contact.id);
      if (photos.length === 0) return "Can't yet: there are no new photos to build with. Ask them to send a few here.";

      await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "BUILDING" } });
      const big = (facts.rooms ?? 0) >= 8 || (contact.qualification as { jev?: { fit?: string } } | null)?.jev?.fit === "established, with several rooms or properties";
      const made = await serverApi.makeSites({
        name: contact.lodgeName,
        town: contact.city,
        whatsapp: contact.phone,
        contactName: contact.name,
        email: contact.email ?? undefined,
        kind: facts.kind ?? undefined,
        plans: big ? ["STARTER", "GROWTH", "PRO"] : ["STARTER", "GROWTH"],
        // A free preview, like the sign-up page's: offline after DEMO_DAYS unless they pay
        previewDays: DEMO_DAYS,
      });
      for (const [index, photo] of photos.entries()) {
        const prepared = await preparePhoto(photo.data).catch(() => null);
        if (!prepared) continue;
        for (const site of made.sites) {
          await serverApi
            .uploadPhoto(site.slug, photoForm(prepared, `photo-${index + 1}`))
            .catch((error: unknown) => ctx.log("error", { tool: "make_sites", site: site.slug, photo: photo.id, error: String(error) }));
        }
      }
      await prisma.inboundMedia.updateMany({ where: { id: { in: photos.map((photo) => photo.id) } }, data: { usedAt: new Date() } });

      const message = siteOptionsMessage({ lodge: contact.lodgeName, city: contact.city, name: givenName(contact), sites: made.sites, previewDays: DEMO_DAYS });
      await ctx.send(message);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { agentStage: "OFFER", nextFollowUpAt: new Date(Date.now() + 20 * 60 * 60 * 1000), followUps: 0, status: "REACHED" },
      });
      await ctx.log("tool", { tool: "make_sites", sites: made.sites.map((site) => site.slug) });
      await alertKin(`New sites sent to ${contact.lodgeName} (${contact.city}), +${contact.phone}: ${made.sites.map((site) => `$${site.monthlyPrice} ${site.url}`).join(" · ")}`);
      return `Built ${made.sites.length} sites and sent them the options message with the links, prices and the question "which one do you like". If they already told you their rooms and prices, address or other numbers (see Notes), put them on now with edit_site, without telling them. Then say nothing more this turn unless they asked something else; then answer it briefly, with no question.`;
    }

    case "choose_site": {
      const sites = await leadSites(contact.id);
      const site = sites.find((candidate) => candidate.option === Number(args.option));
      if (!site) return `There's no option ${String(args.option)}. Their options: ${sites.map((s) => `${s.option} ($${s.monthlyPrice})`).join(", ")}.`;
      // The one they chose stays up while they pay, even if its preview ended
      const reopened = await reopenEndedPreviews([site], ctx.log);
      await prisma.contact.update({ where: { id: contact.id }, data: { chosenSiteId: site.id, agentStage: "CHOSEN", nextFollowUpAt: null } });
      await alertKin(`${contact.lodgeName ?? contact.name} chose option ${site.option}: $${site.monthlyPrice}/month, ${site.url}`);
      const wa = contact.phone.startsWith("2637") ? `0${contact.phone.slice(3)}` : null;
      const next = contact.email
        ? `ask which EcoCash number to send the payment prompt to${wa ? ` (offer ${wa}, their WhatsApp number)` : ""}`
        : `ask for their email ("for the receipt and to hand the site over to you"), then which EcoCash number to send the payment prompt to${wa ? ` (offer ${wa}, their WhatsApp number)` : ""}`;
      return `Recorded: option ${site.option}, $${site.monthlyPrice} a month${foundingOpen(new Date()) ? " (founding price, theirs for life)" : ""}.${reopened.length ? ` Its free preview had ended, so it's back online for ${DEMO_DAYS} more days (the same link works again).` : ""} Now ${next}.`;
    }

    case "start_ecocash":
    case "send_payment_link": {
      if (contact.agentStage === "PAID") return "They've paid already, and their confirmation was sent. Don't ask for a payment.";
      const sites = await leadSites(contact.id);
      const site = sites.find((candidate) => candidate.id === contact.chosenSiteId);
      if (!site) return "They haven't chosen a site yet: ask which one (1, 2 or 3) first.";
      const months = [1, 3, 12].includes(Number(args.months)) ? Number(args.months) : 1;
      let link: Awaited<ReturnType<typeof payLinkFor>>;
      try {
        link = await payLinkFor(contact.id, site.slug, months);
      } catch (error) {
        await ctx.log("error", { tool: name, step: "payment link", error: String(error) });
        return `A payment link couldn't be made (${error instanceof Error ? error.message : "the API didn't answer"}). Hand over (hand_over) so Kin takes the payment.`;
      }

      // The link, as the way to pay (asked for, or instead of a prompt), watched until it's paid
      const sendLink = async (message: string, why: string) => {
        await ctx.send(message);
        ctx.done = true;
        await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "PAYING", nextFollowUpAt: null } });
        await ctx.log("payment_link", { token: link.token, slug: site.slug, months, amountCents: link.amountCents, url: link.url, why });
        watchPayment({ contactId: contact.id, chatId: ctx.chatId, account: ctx.account, token: link.token, slug: site.slug, paymentId: null, sentAt: Date.now() });
      };
      const settled = "I'll confirm in the chat on my own the moment Paynow says it's paid. Say nothing more this turn, and never say it's paid yourself.";

      if (name === "send_payment_link") {
        await sendLink(payLinkMessage(link.url, link.amountCents), "asked for a link");
        return `Sent the payment link (EcoCash, OneMoney, InnBucks or card). ${settled}`;
      }

      const local = localDigits(String(args.phone ?? ""));
      if (!/^07\d{8}$/.test(local)) return "That doesn't look like a Zimbabwe mobile number (07…). Ask them to check it.";
      const wallet = walletFor(local);
      if (!wallet) {
        await sendLink(linkInsteadMessage(link.url, link.amountCents, "number"), `no prompt for ${local}`);
        return `${local} can't get an EcoCash or OneMoney prompt, so they were sent the payment link instead. ${settled}`;
      }
      try {
        const started = await serverApi.startPayment(link.token, wallet, local);
        await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "PAYING", nextFollowUpAt: null } });
        await ctx.log("payment", {
          token: link.token,
          paymentId: started.payment.id,
          slug: site.slug,
          phone: local,
          channel: wallet,
          months,
          amountCents: started.payment.amountCents,
          url: link.url,
        });
        await ctx.send(promptSentMessage(started.payment.amountCents, local, wallet));
        ctx.done = true;
        watchPayment({ contactId: contact.id, chatId: ctx.chatId, account: ctx.account, token: link.token, slug: site.slug, paymentId: started.payment.id, sentAt: Date.now() });
        return `Sent the ${wallet === "ecocash" ? "EcoCash" : "OneMoney"} prompt and the message telling them to enter their PIN. If it fails or times out, they're told with the link to pay instead. ${settled}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Paynow didn't answer";
        await ctx.log("error", { tool: "start_ecocash", error: message });
        if (error instanceof ApiError && error.status === 409 && /paid already/i.test(message)) {
          const watch = await latestPaymentWatch(contact.id);
          if (watch) await checkPayment(watch).catch(() => null);
          ctx.done = true;
          return "It's paid already: their confirmation is sent. Say nothing more this turn.";
        }
        // Paying online is off, or the link can't be paid (out of date): a link wouldn't work either
        if (error instanceof ApiError && [409, 410, 503].includes(error.status)) {
          return `Paying online isn't possible right now (${message}). Hand over (hand_over) so Kin takes the payment another way.`;
        }
        // Paynow refused the prompt or didn't answer: the link, right away
        await sendLink(linkInsteadMessage(link.url, link.amountCents, "failed"), `prompt failed: ${message}`);
        return `The prompt couldn't be sent (${message}), so they were sent the payment link instead. ${settled}`;
      }
    }

    case "send_options_again": {
      const sites = await leadSites(contact.id);
      if (!sites.length || !contact.lodgeName) return "Their sites aren't made yet.";
      const reopened = await reopenEndedPreviews(sites, ctx.log);
      await ctx.send(siteOptionsMessage({ lodge: contact.lodgeName, city: contact.city, name: givenName(contact), sites, ...(reopened.length ? { previewDays: DEMO_DAYS } : {}) }));
      return `Sent their options again${reopened.length ? `, with their previews back online for ${DEMO_DAYS} more days (they had ended)` : ""}. Don't repeat them.`;
    }

    case "check_payment": {
      const watch = await latestPaymentWatch(contact.id);
      if (!watch) return contact.agentStage === "PAID" ? "They've paid; their confirmation was sent." : "No payment has been started yet.";
      // Checks with Paynow now, and sends the confirmation (or the failure) itself
      const step = await checkPayment(watch, { fresh: true });
      if (step.kind === "paid") {
        if (contact.agentStage === "PAID") return "Paid: their confirmation, site and claim link were sent already. Answer anything else they asked, briefly.";
        ctx.done = true;
        return "Paid: their confirmation, site and claim link were just sent. Say nothing more this turn.";
      }
      const status = await serverApi.linkStatus(watch.token);
      if (status.link.state === "expired") return "Their payment link expired unpaid. If they want to pay, start_ecocash (or send_payment_link) makes a new one.";
      const prompt = watch.paymentId ? status.payments.find((payment) => payment.id === watch.paymentId) : undefined;
      if (prompt && (prompt.status === "FAILED" || prompt.status === "CANCELLED")) {
        return `Their ${prompt.channelName} prompt ${prompt.status === "FAILED" ? "failed" : "was cancelled"}, nothing was taken, and they were told with the link to pay instead. Offer to send the prompt again (start_ecocash).`;
      }
      const minutes = Math.max(1, Math.round((Date.now() - watch.sentAt) / 60_000));
      if (prompt) {
        return `Not paid yet: Paynow is still waiting for them to approve the ${prompt.channelName} prompt sent ${minutes} minute${minutes === 1 ? "" : "s"} ago. If it didn't show or timed out, offer to send it again (start_ecocash) or the link (${status.link.url}). It's confirmed here on its own once paid.`;
      }
      return `Not paid yet on the link sent ${minutes} minute${minutes === 1 ? "" : "s"} ago (${status.link.url}). If they just paid, it can take a minute; the confirmation comes here on its own.`;
    }

    case "view_site":
      return viewSites(contact.id, typeof args.option === "number" ? args.option : undefined);

    case "edit_site":
      return editSites(contact.id, args, ctx.log);

    case "hand_over": {
      await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "HANDOVER", agentPaused: true, nextFollowUpAt: null } });
      await ctx.send(handoverMessage());
      await alertKin(`Needs you: ${contact.lodgeName ?? contact.name} (+${contact.phone}). ${text(args.reason) ?? ""}`.trim());
      await ctx.log("tool", { tool: "hand_over", reason: args.reason });
      ctx.silent = "handed over";
      return "Handed over and told them Kin will reply. Say nothing more.";
    }

    case "check_in_later": {
      const days = Math.min(60, Math.max(1, Math.round(Number(args.days) || 7)));
      await prisma.contact.update({
        where: { id: contact.id },
        data: { nextFollowUpAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000), followUps: contact.agentStage === "OFFER" ? 1 : 0, ...(contact.agentStage === "NEW" ? { agentStage: "DETAILS" } : {}) },
      });
      return `We'll check in with them in ${days} day${days === 1 ? "" : "s"}. Now reply briefly and warmly, with no question.`;
    }

    case "label_lead": {
      const label = args.label === "qualified" || args.label === "unqualified" ? args.label : null;
      if (!label) return "Label must be qualified or unqualified.";
      ctx.label = label;
      await ctx.log("tool", { tool: "label_lead", reason: `${label}: ${text(args.why) ?? ""}` });
      return "Noted. Carry on with your reply (or silence) as usual; never mention labels to them.";
    }

    case "stay_silent": {
      const reason = String(args.reason ?? "conversation_over");
      ctx.silent = reason;
      if (reason === "not_interested") {
        await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "DISQUALIFIED", disqualifiedReason: "said they're not interested", nextFollowUpAt: null } });
        if (contact.agentStage === "OFFER" || contact.agentStage === "CHOSEN") await alertKin(`${contact.lodgeName ?? contact.name} said they're not interested (+${contact.phone}).`);
      }
      if (reason === "not_a_fit") {
        await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "DISQUALIFIED", disqualifiedReason: "not a fit (the agent's call)", nextFollowUpAt: null } });
      }
      if (reason === "will_get_back") {
        // A no reply is "not right now": check in once, when they said (a week if they didn't)
        const days = Math.min(30, Math.max(1, Math.round(Number(args.follow_up_days) || 7)));
        await prisma.contact.update({ where: { id: contact.id }, data: { nextFollowUpAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000), followUps: contact.agentStage === "OFFER" ? 1 : 0 } });
      }
      return "OK: no reply this time.";
    }

    default:
      return `Unknown tool ${name}.`;
  }
}
