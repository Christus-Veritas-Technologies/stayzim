import type { Email } from "./index";
import { BRAND, button, escapeHtml, greeting, layout, MUTED } from "./layout";

/**
 * Emails about bookings: to the owner when a guest asks for dates, and to the
 * guest (only when they gave an email) when the owner answers. Callers pass
 * dates and amounts already written out ("12–15 Oct", "$285").
 */

type Stay = {
  lodgeName: string;
  roomName: string;
  /** "12–15 Oct" */
  dates: string;
  nights: number;
  guests: number | null;
  /** "$285" */
  total: string;
  reference: string;
};

function rows(stay: Stay, extra: [string, string][] = []): [string, string][] {
  return [
    ["Room", stay.roomName],
    ["Dates", `${stay.dates} (${stay.nights} ${stay.nights === 1 ? "night" : "nights"})`],
    ...(stay.guests ? ([["Guests", String(stay.guests)]] as [string, string][]) : []),
    ["Total", stay.total],
    ["Reference", stay.reference],
    ...extra,
  ];
}

function summary(list: [string, string][]) {
  const cells = list
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:${MUTED};font-size:14px">${escapeHtml(label)}</td><td align="right" style="padding:6px 0;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-top:1px solid #E4E9EC;border-bottom:1px solid #E4E9EC">${cells}</table>`;
}

function textRows(list: [string, string][]) {
  return list.map(([label, value]) => `${label}: ${value}`);
}

/** Guests' emails come from the lodge, through StayZim. */
function guestFooter(lodgeName: string) {
  return `Sent for ${escapeHtml(lodgeName)} by StayZim. Reply to this email or message the lodge on WhatsApp.`;
}

function whatsappButton(url: string, label: string) {
  return `<p style="margin:0 0 8px"><a href="${escapeHtml(url)}" style="color:${BRAND};font-weight:600">${escapeHtml(label)}</a></p>`;
}

/** To the owner: a guest sent a booking request from the site (or booked, when bookings confirm themselves). */
export function bookingRequestEmail(input: Stay & {
  /** Confirmed straight away (the owner's "Confirm bookings automatically") */
  confirmed?: boolean;
  to: string;
  ownerName: string;
  guestName: string;
  /** "+263 77 123 4567" */
  guestPhone: string;
  guestWhatsappUrl: string;
  message: string | null;
  requestsUrl: string;
}): Email {
  const list = rows(input, [["Guest", `${input.guestName}, ${input.guestPhone}`]]);
  const confirmed = Boolean(input.confirmed);
  const action = confirmed ? "See your bookings" : "Confirm or decline";
  const after = confirmed ? "It's confirmed and the nights are held. Cancel it from your dashboard if you need to." : "The dates aren't held until you confirm.";
  return {
    to: input.to,
    subject: `${confirmed ? "New booking" : "New booking request"}: ${input.roomName}, ${input.dates}`,
    text: [
      `Hi ${input.ownerName.split(" ")[0]},`,
      "",
      confirmed ? `${input.guestName} booked a stay at ${input.lodgeName}.` : `${input.guestName} would like to stay at ${input.lodgeName}.`,
      "",
      ...textRows(list),
      ...(input.message ? ["", `Their note: ${input.message}`] : []),
      "",
      `${action}: ${input.requestsUrl}`,
      `WhatsApp ${input.guestName}: ${input.guestWhatsappUrl}`,
      "",
      after,
    ].join("\n"),
    html: layout({
      preview: confirmed ? `${input.guestName} booked ${input.roomName}, ${input.dates}.` : `${input.guestName} asked for ${input.roomName}, ${input.dates}.`,
      body: `${greeting(input.ownerName)}
<p style="margin:0">${escapeHtml(input.guestName)} ${confirmed ? "booked a stay" : "would like to stay"} at <strong>${escapeHtml(input.lodgeName)}</strong>.</p>
${summary(list)}
${input.message ? `<p style="margin:16px 0 0;padding:12px 14px;background:#F4F7F9;border-radius:10px;font-size:14px;line-height:21px">“${escapeHtml(input.message)}”</p>` : ""}
${button(input.requestsUrl, action)}
${whatsappButton(input.guestWhatsappUrl, `WhatsApp ${input.guestName}`)}
<p style="margin:0;font-size:13px;line-height:20px;color:${MUTED}">${after}</p>`,
    }),
  };
}

/** To the guest: the lodge confirmed the booking. */
export function bookingConfirmedEmail(input: Stay & {
  to: string;
  guestName: string;
  /** "Check-in from 14:00 · Check-out by 10:00" */
  times: string | null;
  lodgeWhatsappUrl: string | null;
  replyTo?: string;
}): Email {
  const list = rows(input);
  return {
    to: input.to,
    replyTo: input.replyTo,
    subject: `Your stay at ${input.lodgeName} is confirmed`,
    text: [
      `Hi ${input.guestName.split(" ")[0]},`,
      "",
      `${input.lodgeName} confirmed your booking.`,
      "",
      ...textRows(list),
      ...(input.times ? ["", input.times] : []),
      ...(input.lodgeWhatsappUrl ? ["", `Questions? WhatsApp the lodge: ${input.lodgeWhatsappUrl}`] : []),
    ].join("\n"),
    html: layout({
      preview: `${input.roomName}, ${input.dates}. See you soon.`,
      footer: guestFooter(input.lodgeName),
      body: `${greeting(input.guestName)}
<p style="margin:0"><strong>${escapeHtml(input.lodgeName)}</strong> confirmed your booking. See you soon!</p>
${summary(list)}
${input.times ? `<p style="margin:16px 0 0;font-size:14px;color:${MUTED}">${escapeHtml(input.times)}</p>` : ""}
${input.lodgeWhatsappUrl ? button(input.lodgeWhatsappUrl, "WhatsApp the lodge") : ""}`,
    }),
  };
}

/** To the guest: the lodge can't take the request, or cancelled a confirmed booking. */
export function bookingClosedEmail(input: Stay & {
  to: string;
  guestName: string;
  kind: "declined" | "cancelled";
  reason: string | null;
  siteUrl: string;
  replyTo?: string;
}): Email {
  const declined = input.kind === "declined";
  const subject = declined ? `${input.lodgeName} can't take your booking` : `Your booking at ${input.lodgeName} is cancelled`;
  const line = declined
    ? `Sorry, ${input.lodgeName} can't take your request for ${input.roomName}, ${input.dates}.`
    : `${input.lodgeName} cancelled your booking for ${input.roomName}, ${input.dates}.`;
  return {
    to: input.to,
    replyTo: input.replyTo,
    subject,
    text: [
      `Hi ${input.guestName.split(" ")[0]},`,
      "",
      line,
      ...(input.reason ? ["", input.reason] : []),
      "",
      `Reference: ${input.reference}`,
      `Other dates or rooms: ${input.siteUrl}`,
    ].join("\n"),
    html: layout({
      preview: line,
      footer: guestFooter(input.lodgeName),
      body: `${greeting(input.guestName)}
<p style="margin:0">${escapeHtml(line)}</p>
${input.reason ? `<p style="margin:16px 0 0;padding:12px 14px;background:#F4F7F9;border-radius:10px;font-size:14px;line-height:21px">${escapeHtml(input.reason)}</p>` : ""}
<p style="margin:16px 0 0;font-size:14px;color:${MUTED}">Reference ${escapeHtml(input.reference)}</p>
${button(input.siteUrl, "See other dates")}`,
    }),
  };
}
