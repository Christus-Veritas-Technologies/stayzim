import type { Email } from "./index";
import { BRAND, button, escapeHtml, greeting, heading, layout, linkFallback, small, summary, summaryText } from "./layout";

/**
 * Emails about a lodge's demo and billing. Callers pass dates and amounts
 * already written out ("Thursday 8 October", "$40.00"), in Zimbabwe time.
 */

/** "Issued by StayZim · Mutare, Zimbabwe · Tax no. …", under invoices and receipts. */
function issuedBy(line: string | undefined) {
  return line ? `<p style="margin:16px 0 0;font-size:12px;line-height:18px;color:#6C767D">Issued by ${escapeHtml(line)}</p>` : "";
}


/**
 * Welcome, and "your site is ready": right after sign-up, or once a guest from
 * /create claims the site. The free preview's end, and how to launch it.
 */
export function demoWelcomeEmail(input: {
  to: string;
  name: string;
  lodgeName: string;
  siteUrl: string;
  dashboardUrl: string;
  plan: string;
  price: string;
  endsAt: string;
  /** A founding lodge: its price stays for life */
  founding?: boolean;
}): Email {
  const price = `${input.plan} is ${input.price} a month${input.founding ? ", your founding price for life" : ""}`;
  return {
    to: input.to,
    subject: `Welcome to StayZim: ${input.lodgeName} is ready`,
    text: [
      `Hi ${input.name},`,
      "",
      `Welcome to StayZim. ${input.lodgeName} has its own website now: ${input.siteUrl}`,
      "",
      `It's a free preview until ${input.endsAt}. Check it on your phone, add your photos and rooms from your dashboard, and share the link.`,
      `Love it? Launch it from Billing to keep it live: ${input.dashboardUrl}/billing (${price}). Not for you? Do nothing, and pay nothing.`,
      "",
      `Your dashboard: ${input.dashboardUrl}`,
    ].join("\n"),
    html: layout({
      preview: `Your site is ready. It's a free preview until ${input.endsAt}.`,
      body: `${heading("Welcome to StayZim")}
${greeting(input.name)}
<p style="margin:0 0 16px"><strong>${escapeHtml(input.lodgeName)}</strong> has its own website now:<br><a href="${escapeHtml(input.siteUrl)}" style="color:${BRAND};font-weight:600">${escapeHtml(input.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
<p style="margin:0 0 16px">It's a free preview until <strong>${escapeHtml(input.endsAt)}</strong>. Check it on your phone, add your photos and rooms, and share the link with past guests.</p>
<p style="margin:0">Love it? Launch it to keep it live: ${escapeHtml(price)}. The preview marks go as soon as you do. Not for you? Do nothing, and pay nothing.</p>
${button(`${input.dashboardUrl}/billing`, "Launch my site")}
${small(`Or open your dashboard: <a href="${escapeHtml(input.dashboardUrl)}" style="color:${BRAND}">${escapeHtml(input.dashboardUrl.replace(/^https?:\/\//, ""))}</a>`)}`,
    }),
  };
}

export type InvoiceNotice = "DUE_IN_3" | "DUE_IN_1" | "DUE_TODAY";

/**
 * The invoice, sent 3 days before, the day before, and on the day it's due.
 * For a free preview it's the first payment (launching it), due when the preview ends.
 */
export function invoiceEmail(input: {
  to: string;
  name: string;
  lodgeName: string;
  notice: InvoiceNotice;
  demo: boolean;
  number: string;
  plan: string;
  amount: string;
  period: string;
  due: string;
  payUrl: string;
  /** Who issues it, e.g. "StayZim · Mutare, Zimbabwe" */
  issuedBy?: string;
}): Email {
  const when = input.notice === "DUE_TODAY" ? "today" : input.notice === "DUE_IN_1" ? "tomorrow" : `on ${input.due}`;
  const subject = input.demo
    ? input.notice === "DUE_TODAY"
      ? `Your ${input.lodgeName} free preview ends today`
      : `Your ${input.lodgeName} free preview ends ${when}`
    : `Invoice ${input.number}: ${input.amount} due ${when}`;
  const lead = input.demo
    ? `Your free preview of ${input.lodgeName} ends ${when}, and the site goes offline then. Love it? Launch it to keep it live, just as it is.`
    : `Your StayZim plan for ${input.lodgeName} renews ${when}. Pay before then so your site stays up without a break.`;
  const rows: [string, string][] = [
    ["Invoice", input.number],
    ["Plan", input.plan],
    ["Period", input.period],
    ["Due", input.due],
    ["Amount", input.amount],
  ];
  return {
    to: input.to,
    sender: "billing",
    subject,
    text: [
      `Hi ${input.name},`,
      "",
      lead,
      "",
      ...summaryText(rows),
      "",
      `Pay through Paynow (EcoCash, InnBucks, OneMoney, card and more): ${input.payUrl}`,
      "",
      "Already paid? Thank you. You can ignore this email.",
      ...(input.issuedBy ? ["", `Issued by ${input.issuedBy}`] : []),
    ].join("\n"),
    html: layout({
      preview: lead,
      label: "Billing",
      body: `${heading(input.demo ? "Launch your site" : `Invoice ${input.number}`)}
${greeting(input.name)}
<p style="margin:0">${escapeHtml(lead)}</p>
${summary(rows)}
${button(input.payUrl, input.demo ? `Launch for ${input.amount}` : `Pay ${input.amount}`)}
${small("Every payment goes through Paynow: EcoCash, InnBucks, OneMoney, card and more. Already paid? Thank you, you can ignore this email.")}
${linkFallback(input.payUrl)}
${issuedBy(input.issuedBy)}`,
    }),
  };
}

/** After a payment, by Paynow or recorded by StayZim. */
export function receiptEmail(input: {
  to: string;
  name: string;
  lodgeName: string;
  number: string;
  amount: string;
  plan: string;
  months: number;
  paidOn: string;
  method: string;
  paidUntil: string;
  receiptUrl: string;
  issuedBy?: string;
  /** "Moved from Pro to Starter", when the payment changed the plan */
  change?: string;
  /** The design that went live with it, when one was picked */
  design?: string;
}): Email {
  const rows: [string, string][] = [
    ["Receipt", input.number],
    ["Paid on", input.paidOn],
    ["Plan", `${input.plan}, ${input.months} ${input.months === 1 ? "month" : "months"}`],
    ...(input.change ? ([["Plan change", input.change]] as [string, string][]) : []),
    ...(input.design ? ([["Design", input.design]] as [string, string][]) : []),
    ["Paid with", input.method],
    ["Site live until", input.paidUntil],
    ["Amount", input.amount],
  ];
  return {
    to: input.to,
    sender: "billing",
    subject: `Receipt ${input.number}: ${input.amount} for ${input.lodgeName}`,
    text: [`Hi ${input.name},`, "", `Thank you. We've received ${input.amount} for ${input.lodgeName}.`, "", ...summaryText(rows), "", `Your receipt: ${input.receiptUrl}`, ...(input.issuedBy ? ["", `Issued by ${input.issuedBy}`] : [])].join("\n"),
    html: layout({
      preview: `Thank you. We've received ${input.amount} for ${input.lodgeName}.`,
      label: "Receipt",
      body: `${heading("Payment received")}
${greeting(input.name)}
<p style="margin:0">Thank you. We've received <strong>${escapeHtml(input.amount)}</strong> for ${escapeHtml(input.lodgeName)}.</p>
${summary(rows)}
${button(input.receiptUrl, "View or print the receipt")}
${issuedBy(input.issuedBy)}`,
    }),
  };
}

/** A free preview's time is up: the site is offline, and it's kept for a while. */
export function demoEndedEmail(input: { to: string; name: string; lodgeName: string; payUrl: string; keptUntil: string }): Email {
  return {
    to: input.to,
    sender: "billing",
    subject: `Your ${input.lodgeName} free preview has ended`,
    text: [
      `Hi ${input.name},`,
      "",
      `Your free preview of ${input.lodgeName} has ended, so the site is offline for now.`,
      `We keep everything until ${input.keptUntil}. Launch it and it's back live straight away, just as you left it: ${input.payUrl}`,
    ].join("\n"),
    html: layout({
      preview: `Launch ${input.lodgeName} and it's back live straight away.`,
      label: "Billing",
      body: `${heading("Your free preview has ended")}
${greeting(input.name)}
<p style="margin:0 0 16px">Your free preview of <strong>${escapeHtml(input.lodgeName)}</strong> has ended, so the site is offline for now.</p>
<p style="margin:0">We keep your photos, rooms and everything else until <strong>${escapeHtml(input.keptUntil)}</strong>. Launch it and it's back live straight away, just as you left it.</p>
${button(input.payUrl, "Launch my site")}
${linkFallback(input.payUrl)}`,
    }),
  };
}

export type PreviewReminder = "DAY_3" | "DAY_10";

/**
 * 3 and 10 days after sign-up, while the site still isn't launched: it's
 * waiting, everything is kept until `keptUntil`, and launching brings it back.
 */
export function previewReminderEmail(input: {
  to: string;
  name: string;
  lodgeName: string;
  day: PreviewReminder;
  plan: string;
  price: string;
  founding: boolean;
  keptUntil: string;
  payUrl: string;
}): Email {
  const price = `${input.plan} is ${input.price} a month${input.founding ? ", the founding price you joined on, for life" : ""}`;
  const subject = input.day === "DAY_3" ? `${input.lodgeName} is waiting for you` : `Still thinking about ${input.lodgeName}?`;
  const lead =
    input.day === "DAY_3"
      ? `Your site for ${input.lodgeName} is built and waiting. Launch it and guests can find you and book you on WhatsApp today.`
      : `We're keeping ${input.lodgeName} just as you left it until ${input.keptUntil}. After that it's deleted. Launch it any time before then.`;
  return {
    to: input.to,
    sender: "billing",
    subject,
    text: [`Hi ${input.name},`, "", lead, "", `${price}. No commission on bookings.`, "", `Launch it: ${input.payUrl}`, "", "Not for you? Do nothing, and pay nothing."].join("\n"),
    html: layout({
      preview: lead,
      label: "Your site",
      body: `${heading(input.day === "DAY_3" ? "Your site is waiting" : "Still thinking about it?")}
${greeting(input.name)}
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0">${escapeHtml(price)}. No commission on bookings.</p>
${button(input.payUrl, "Launch my site")}
${small("Not for you? Do nothing, and pay nothing.")}
${linkFallback(input.payUrl)}`,
    }),
  };
}

/**
 * On 20 October, two days before founding prices end, to sites that aren't
 * launched yet: they joined in time, so they keep the founding price for life.
 */
export function foundingDeadlineEmail(input: {
  to: string;
  name: string;
  lodgeName: string;
  plan: string;
  price: string;
  normalPrice: string;
  keptUntil: string;
  payUrl: string;
}): Email {
  const lead = `Founding prices end on 22 October. ${input.lodgeName} joined in time, so it keeps its founding price for life: ${input.plan} at ${input.price} a month instead of ${input.normalPrice}.`;
  return {
    to: input.to,
    sender: "billing",
    subject: "Founding prices end on 22 October",
    text: [`Hi ${input.name},`, "", lead, "", `We keep your site until ${input.keptUntil}. Launch it before then and the price is yours: ${input.payUrl}`].join("\n"),
    html: layout({
      preview: lead,
      label: "Your site",
      body: `${heading("Founding prices end on 22 October")}
${greeting(input.name)}
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0">We keep your site until <strong>${escapeHtml(input.keptUntil)}</strong>. Launch it before then and the price is yours.</p>
${button(input.payUrl, "Launch my site")}
${linkFallback(input.payUrl)}`,
    }),
  };
}

/** A paid site went offline after its grace days without payment. */
export function siteOfflineEmail(input: { to: string; name: string; lodgeName: string; amount: string; payUrl: string }): Email {
  return {
    to: input.to,
    sender: "billing",
    subject: `${input.lodgeName} is offline until it's paid for`,
    text: [
      `Hi ${input.name},`,
      "",
      `We didn't receive this month's payment for ${input.lodgeName}, so the site is offline for now. Guests see a short "taking a break" page.`,
      `Pay ${input.amount} and it comes back straight away: ${input.payUrl}`,
      "",
      "Paid already? Reply to this email with your proof of payment and we'll sort it out.",
    ].join("\n"),
    html: layout({
      preview: `Pay ${input.amount} and ${input.lodgeName} comes back straight away.`,
      label: "Billing",
      body: `${heading("Your site is offline")}
${greeting(input.name)}
<p style="margin:0 0 16px">We didn't receive this month's payment for <strong>${escapeHtml(input.lodgeName)}</strong>, so the site is offline for now. Guests see a short "taking a break" page.</p>
<p style="margin:0">Pay ${escapeHtml(input.amount)} and it comes back straight away.</p>
${button(input.payUrl, `Pay ${input.amount}`)}
${small("Paid already? Reply to this email with your proof of payment and we'll sort it out.")}`,
    }),
  };
}
