import prisma from "@stayzim/db";
import { DEMO_DAYS, foundingOpen, LODGE_KIND_KEYS, monthlyPrice, type Plan } from "@stayzim/sites";
import sharp from "sharp";

import { siteUrl } from "@/lib/site-url";

import { alertKin } from "./alerts";
import type { ToolDefinition } from "./openrouter";
import { watchPayment } from "./payments";
import { serverApi } from "./server-api";
import { handoverMessage, payLinkMessage, promptSentMessage, siteOptionsMessage } from "./templates";

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
};

const PLAN_ORDER: Plan[] = ["STARTER", "GROWTH", "PRO"];

/** The lead's sites, numbered as in the options message (by plan). */
export async function leadSites(contactId: string) {
  const sites = await prisma.lodge.findMany({ where: { leadId: contactId }, select: { id: true, slug: true, customDomain: true, plan: true, founding: true, status: true } });
  return sites
    .sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan))
    .map((site, index) => ({ ...site, option: index + 1, url: siteUrl(site), monthlyPrice: monthlyPrice(site.plan, site.founding) }));
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
      description: "Send their sites' options message again (links and prices), when they lost it or ask to see the options again.",
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
      description: "Send an EcoCash prompt for the site they chose to this number (1 month, or 3 or 12 ahead if they asked). It sends the message telling them to enter their PIN.",
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
      description: "Send a link to pay by card, bank, OneMoney or InnBucks (when they don't want an EcoCash prompt).",
      parameters: { type: "object", properties: { months: { type: "integer", enum: [1, 3, 12], description: "How many months they pay for (default 1)" } } },
    },
  },
  {
    type: "function",
    function: { name: "check_payment", description: "How their latest payment is going (when they say they've paid, or ask).", parameters: { type: "object", properties: {} } },
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
      return `Built ${made.sites.length} sites and sent them the options message with the links, prices and the question "which one do you like". Say nothing more this turn unless they asked something else; then answer it briefly, with no question.`;
    }

    case "choose_site": {
      const sites = await leadSites(contact.id);
      const site = sites.find((candidate) => candidate.option === Number(args.option));
      if (!site) return `There's no option ${String(args.option)}. Their options: ${sites.map((s) => `${s.option} ($${s.monthlyPrice})`).join(", ")}.`;
      await prisma.contact.update({ where: { id: contact.id }, data: { chosenSiteId: site.id, agentStage: "CHOSEN", nextFollowUpAt: null } });
      await alertKin(`${contact.lodgeName ?? contact.name} chose option ${site.option}: $${site.monthlyPrice}/month, ${site.url}`);
      const wa = contact.phone.startsWith("2637") ? `0${contact.phone.slice(3)}` : null;
      const next = contact.email
        ? `ask which EcoCash number to send the payment prompt to${wa ? ` (offer ${wa}, their WhatsApp number)` : ""}`
        : `ask for their email ("for the receipt and to hand the site over to you"), then which EcoCash number to send the payment prompt to${wa ? ` (offer ${wa}, their WhatsApp number)` : ""}`;
      return `Recorded: option ${site.option}, $${site.monthlyPrice} a month${foundingOpen(new Date()) ? " (founding price, theirs for life)" : ""}. Now ${next}.`;
    }

    case "start_ecocash":
    case "send_payment_link": {
      const sites = await leadSites(contact.id);
      const site = sites.find((candidate) => candidate.id === contact.chosenSiteId);
      if (!site) return "They haven't chosen a site yet: ask which one (1, 2 or 3) first.";
      const months = [1, 3, 12].includes(Number(args.months)) ? Number(args.months) : 1;
      const link = await serverApi.paymentLink(site.slug, months);
      const token = link.url.split("/").pop()!;
      if (name === "send_payment_link") {
        await ctx.send(payLinkMessage(link.url, link.amountCents));
        ctx.done = true;
        await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "PAYING" } });
        await ctx.log("tool", { tool: "send_payment_link", slug: site.slug, url: link.url });
        return "Sent the payment link. Paynow confirms on its own. Say nothing more this turn.";
      }
      const phone = String(args.phone ?? "").replace(/\D/g, "");
      const local = phone.startsWith("263") ? `0${phone.slice(3)}` : phone.startsWith("7") ? `0${phone}` : phone;
      if (!/^07\d{8}$/.test(local)) return "That doesn't look like a Zimbabwe mobile number (07…). Ask them to check it.";
      try {
        const started = await serverApi.startPayment(token, "ecocash", local);
        await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "PAYING" } });
        await ctx.log("payment", { token, paymentId: started.payment.id, slug: site.slug, phone: local, amountCents: started.payment.amountCents });
        await ctx.send(promptSentMessage(started.payment.amountCents, local));
        ctx.done = true;
        watchPayment({ contactId: contact.id, chatId: ctx.chatId, account: ctx.account, token, paymentId: started.payment.id, slug: site.slug });
        return "Sent the EcoCash prompt and the message telling them to enter their PIN. Say nothing more this turn, and never say it's paid until Paynow confirms.";
      } catch (error) {
        await ctx.log("error", { tool: "start_ecocash", error: String(error) });
        return `The prompt couldn't be sent (${error instanceof Error ? error.message : "Paynow didn't answer"}). Offer a payment link instead (send_payment_link), or hand over.`;
      }
    }

    case "send_options_again": {
      const sites = await leadSites(contact.id);
      if (!sites.length || !contact.lodgeName) return "Their sites aren't made yet.";
      await ctx.send(siteOptionsMessage({ lodge: contact.lodgeName, city: contact.city, name: givenName(contact), sites }));
      return "Sent their options again. Don't repeat them.";
    }

    case "check_payment": {
      const last = await prisma.agentEvent.findFirst({ where: { contactId: contact.id, kind: "payment" }, orderBy: { createdAt: "desc" } });
      if (!last) return "No payment has been started yet.";
      const data = last.data as { token: string; paymentId: string };
      const status = await serverApi.paymentStatus(data.token, data.paymentId);
      return `Paynow says: ${status.payment.status}.${status.payment.status === "PAID" ? " Their confirmation and next steps were sent already." : ""}`;
    }

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
