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


/** Right after sign-up: the site is live, the demo's end, and how to keep it. */
export function demoWelcomeEmail(input: {
  to: string;
  name: string;
  lodgeName: string;
  siteUrl: string;
  dashboardUrl: string;
  plan: string;
  price: string;
  endsAt: string;
}): Email {
  return {
    to: input.to,
    subject: `${input.lodgeName} is live`,
    text: [
      `Hi ${input.name},`,
      "",
      `${input.lodgeName} has its own website now: ${input.siteUrl}`,
      "",
      `It's a free demo until ${input.endsAt}. Add your photos and rooms from your dashboard, share the link, and see the visits come in.`,
      `To keep it live after that, pay for the ${input.plan} plan (${input.price} a month) from Billing: ${input.dashboardUrl}/billing`,
      "",
      `Your dashboard: ${input.dashboardUrl}`,
    ].join("\n"),
    html: layout({
      preview: `Your site is live. It's a free demo until ${input.endsAt}.`,
      body: `${heading(`${input.lodgeName} is live`)}
${greeting(input.name)}
<p style="margin:0 0 16px"><strong>${escapeHtml(input.lodgeName)}</strong> has its own website now:<br><a href="${escapeHtml(input.siteUrl)}" style="color:${BRAND};font-weight:600">${escapeHtml(input.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
<p style="margin:0 0 16px">It's a free demo until <strong>${escapeHtml(input.endsAt)}</strong>. Add your photos and rooms, share the link with past guests, and watch the visits come in.</p>
<p style="margin:0">To keep it live after that, pay for the ${escapeHtml(input.plan)} plan (${escapeHtml(input.price)} a month) from Billing. The demo badges go as soon as you do.</p>
${button(input.dashboardUrl, "Open your dashboard")}
${linkFallback(input.dashboardUrl)}`,
    }),
  };
}

export type InvoiceNotice = "DUE_IN_3" | "DUE_IN_1" | "DUE_TODAY";

/**
 * The invoice, sent 3 days before, the day before, and on the day it's due.
 * For a demo it's the first payment, due when the demo ends.
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
      ? `Your ${input.lodgeName} demo ends today`
      : `Your ${input.lodgeName} demo ends ${when}`
    : `Invoice ${input.number}: ${input.amount} due ${when}`;
  const lead = input.demo
    ? `Your free demo of ${input.lodgeName} ends ${when}, and the site goes offline then. Pay for your first month to keep it live, just as it is.`
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
      body: `${heading(input.demo ? "Keep your site live" : `Invoice ${input.number}`)}
${greeting(input.name)}
<p style="margin:0">${escapeHtml(lead)}</p>
${summary(rows)}
${button(input.payUrl, `Pay ${input.amount}`)}
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

/** A demo's time is up: the site is offline, and it's kept for a while. */
export function demoEndedEmail(input: { to: string; name: string; lodgeName: string; payUrl: string; keptUntil: string }): Email {
  return {
    to: input.to,
    sender: "billing",
    subject: `Your ${input.lodgeName} demo has ended`,
    text: [
      `Hi ${input.name},`,
      "",
      `Your free demo of ${input.lodgeName} has ended, so the site is offline for now.`,
      `We keep everything until ${input.keptUntil}. Pay for a plan and it's back live straight away, just as you left it: ${input.payUrl}`,
    ].join("\n"),
    html: layout({
      preview: `Pay for a plan and ${input.lodgeName} is back live straight away.`,
      label: "Billing",
      body: `${heading("Your demo has ended")}
${greeting(input.name)}
<p style="margin:0 0 16px">Your free demo of <strong>${escapeHtml(input.lodgeName)}</strong> has ended, so the site is offline for now.</p>
<p style="margin:0">We keep your photos, rooms and everything else until <strong>${escapeHtml(input.keptUntil)}</strong>. Pay for a plan and it's back live straight away, just as you left it.</p>
${button(input.payUrl, "Put my site back live")}
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
