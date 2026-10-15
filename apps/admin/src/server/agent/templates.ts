import { FOUNDING_ENDS_AT, foundingOpen, PLAN_PRICES, type Plan } from "@stayzim/sites";

/**
 * The agent's messages with prices, links or payments in them: fixed wording,
 * never the model's own (docs/sales-script.md). The site options are the
 * wording the team approved on 15 October 2026, under 600 characters.
 */

export type OfferSite = { plan: Plan; url: string; monthlyPrice: number };

/** What each plan adds, in a few words (for the options message) */
const ADDS: Record<Plan, (city: string) => string> = {
  STARTER: () => "a single page with your photos, map and WhatsApp booking",
  GROWTH: () => "each room gets its own page, guests book on the site",
  PRO: (city) => `adds reviews, your story and things to do in ${city}`,
};

/** The same, shorter: used only when the message would otherwise pass 600 characters */
const ADDS_SHORT: Record<Plan, (city: string) => string> = {
  STARTER: () => "one page, WhatsApp booking",
  GROWTH: () => "a page per room, booking on the site",
  PRO: () => "adds reviews and things to do nearby",
};

/** WhatsApp shows long messages folded: keep the options under this */
export const OPTIONS_MAX = 600;

const PLAN_ORDER: Plan[] = ["STARTER", "GROWTH", "PRO"];

/** "Hardy House" → "hardyhouse.co.zw" */
export function freeDomain(lodge: string) {
  return `${lodge.toLowerCase().replace(/[^a-z0-9]+/g, "")}.co.zw`;
}

/** "22 October" */
export function foundingDeadline() {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Africa/Harare" }).format(new Date(FOUNDING_ENDS_AT.getTime() - 1));
}

const slash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

/** Their sites to choose from, "1, 2 or 3?": the approved wording, shorter only if it has to be. */
export function siteOptionsMessage(input: { lodge: string; city: string; name?: string | null; sites: OfferSite[]; now?: Date; previewDays?: number }) {
  const full = optionsMessage(input, ADDS, true);
  if (full.length < OPTIONS_MAX) return full;
  const short = optionsMessage(input, ADDS_SHORT, true);
  if (short.length < OPTIONS_MAX) return short;
  const shorter = optionsMessage(input, ADDS_SHORT, false);
  return shorter.length < OPTIONS_MAX ? shorter : optionsMessage(input, ADDS_SHORT, false, true);
}

function optionsMessage(
  input: { lodge: string; city: string; name?: string | null; sites: OfferSite[]; now?: Date; previewDays?: number },
  adds: typeof ADDS,
  withName: boolean,
  compactClose = false,
) {
  const sites = [...input.sites].sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan));
  const founding = foundingOpen(input.now ?? new Date());
  const count = sites.length === 2 ? "two" : sites.length === 3 ? "3" : String(sites.length);
  const first = input.name?.split(" ")[0];
  const lines = sites.map((site, index) => {
    const normally = founding && site.monthlyPrice < PLAN_PRICES[site.plan] && site.plan === "PRO" ? ` (normally $${PLAN_PRICES[site.plan]})` : "";
    return `${index + 1}. $${site.monthlyPrice}/month${normally}: ${adds[site.plan](input.city)}\n${slash(site.url)}`;
  });
  const which = sites.length === 1 ? "Do you like it?" : `Which one do you like, ${sites.map((_, i) => i + 1).join(sites.length === 2 ? " or " : ", ").replace(/, (\d)$/, " or $1")}?`;
  const deadline = founding ? ` This price is only until ${foundingDeadline()}, and` : " And";
  // Long addresses (long names): the same ask, fewer words
  const close = compactClose
    ? `${which}${founding ? ` Price held until ${foundingDeadline()};` : ""} the .co.zw domain is free when you pay.`
    : `${which}${deadline} ${freeDomain(input.lodge)} is free with your first payment.`;
  return [
    `${first && withName ? `Hi ${first}, here's` : "Here's"} ${input.lodge}'s website in ${count} versions:`,
    lines.join("\n\n"),
    `The rooms and prices on it are examples for now; we'll put yours in.${input.previewDays ? ` It's free to look at for ${input.previewDays} days; pick one to keep it live.` : ""}`,
    close,
  ].join("\n\n");
}

/** After an EcoCash prompt went out */
export function promptSentMessage(amountCents: number, phone: string) {
  return `I've sent a prompt for $${(amountCents / 100).toFixed(2)} to ${localPhone(phone)}. Enter your EcoCash PIN on your phone to pay, and I'll confirm here as soon as it's through.`;
}

/** A link to pay by card, bank or another wallet */
export function payLinkMessage(url: string, amountCents: number) {
  return `Here's your payment link for $${(amountCents / 100).toFixed(2)}. You can pay by card, bank, EcoCash, OneMoney or InnBucks:\n${url}`;
}

/** Paid: their site, and the link that makes it theirs */
export function paidMessage(input: { lodge: string; siteUrl: string; claimUrl: string; paidUntil?: string | null }) {
  const until = input.paidUntil
    ? ` until ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Africa/Harare" }).format(new Date(input.paidUntil))}`
    : "";
  return `Paid, thank you! ${input.lodge}'s website is live${until}:\n${slash(input.siteUrl)}\n\nTo make it yours (and edit it later), open this and add your email:\n${input.claimUrl}\n\nSend me your room names and prices whenever you're ready, and we'll put them in.`;
}

export function paymentFailedMessage() {
  return "That one didn't go through, and nothing was taken. Shall I send the prompt again, or a link to pay by card?";
}

/** Gentle follow-ups after the options, a few days apart (a no reply is "not right now") */
export function followUpMessage(n: number, input: { lodge: string; name?: string | null; options: number }) {
  const first = input.name?.split(" ")[0];
  const pick = input.options >= 3 ? "1, 2 or 3" : "1 or 2";
  if (n === 1) return `${first ? `Hi ${first}, ` : ""}did you get a chance to look at ${input.lodge}'s site? Which one would you go with, ${pick}?`;
  return foundingOpen(new Date())
    ? `Quick one: ${input.lodge}'s free preview ends today, and the founding price is yours for life if you start before ${foundingDeadline()}. Shall I keep it live for you?`
    : `Quick one: ${input.lodge}'s free preview ends today. Shall I keep it live for you?`;
}

/** One gentle nudge when they went quiet before sending photos (a day later) */
export function detailsNudgeMessage(lodge: string | null) {
  return `Whenever you have a minute, send me a photo or two of ${lodge ?? "your place"} and I'll build your preview. No rush.`;
}

/** When the agent hands over to Kin */
export function handoverMessage() {
  return "Let me get Kin to help you with that. Kin will message you here shortly.";
}

/** "263771234567" → "077 123 4567" */
export function localPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("263") ? `0${digits.slice(3)}` : digits;
  return /^0\d{9}$/.test(local) ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}
