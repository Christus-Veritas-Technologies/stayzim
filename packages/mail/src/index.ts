import { env } from "@stayzim/env/server";
import nodemailer, { type Transporter } from "nodemailer";

import { billingSmtpOptions, REPLY_TO, smtpOptions, type SmtpOptions } from "./config";

export * from "./config";

/** Guest accounts from /create get a placeholder email here until the owner claims the site; nothing is sent to it. */
export const GUEST_EMAIL_DOMAIN = "guest.stayzim.co.zw";

export type Email = {
  to: string;
  subject: string;
  /** Plain-text part; also what clients that can't show HTML display. */
  text: string;
  html?: string;
  /** Defaults to hello@ (REPLY_TO); emails about a guest's booking reply to the lodge */
  replyTo?: string;
  /** "billing": invoices, reminders and receipts, from billing@. Everything else goes from the main (no-reply) sender. */
  sender?: "billing";
};

export function isMailConfigured(): boolean {
  return smtpOptions(env) !== null;
}

const transporters = new Map<string, Transporter>();

function connect(options: SmtpOptions) {
  return nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.auth,
    // A hung mail server must fail the request, not stall it
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

/**
 * Built on first use, so importing this package never needs SMTP to be
 * configured. Billing mail uses its own login when it has one, else the main one.
 */
function getTransporter(sender: Email["sender"] = undefined) {
  const billing = sender === "billing" ? billingSmtpOptions(env) : null;
  const options = billing ?? smtpOptions(env);
  if (!options) return null;
  const key = billing ? "billing" : "main";
  let transporter = transporters.get(key);
  if (!transporter) {
    transporter = connect(options);
    transporters.set(key, transporter);
  }
  return { transporter, from: options.from };
}

/**
 * Sends one email through the configured SMTP server. Without SMTP (local
 * development), the email is printed to the console so links can still be used.
 * Throws if the SMTP server rejects the message.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (email.to.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`)) return;
  const smtp = getTransporter(email.sender);
  if (!smtp) {
    console.log(
      [
        "",
        `──── Email${email.sender ? ` (${email.sender})` : ""} (SMTP not configured, not sent) ────`,
        `To:      ${email.to}`,
        `Subject: ${email.subject}`,
        "",
        email.text,
        "───────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  await smtp.transporter.sendMail({
    from: smtp.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: email.replyTo ?? REPLY_TO,
  });
}

export type MailCheck = { ok: true } | { ok: false; error: string };

/**
 * Connects and logs in without sending anything, so a wrong host, port or
 * password shows up in the server log at boot rather than when an owner is
 * waiting for a reset link.
 */
export async function verifyMailConnection(sender: Email["sender"] = undefined): Promise<MailCheck> {
  if (sender === "billing" && !billingSmtpOptions(env)) return { ok: false, error: "BILLING_SMTP_USER is not set, so billing mail goes from the main sender" };
  const smtp = getTransporter(sender);
  if (!smtp) return { ok: false, error: "SMTP_HOST and SMTP_FROM (or SMTP_USER) are not set" };
  try {
    await smtp.transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
