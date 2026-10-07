import { env } from "@stayzim/env/server";
import nodemailer, { type Transporter } from "nodemailer";

import { smtpOptions } from "./config";

export * from "./config";

/** Guest accounts from /create get a placeholder email here until the owner claims the site; nothing is sent to it. */
export const GUEST_EMAIL_DOMAIN = "guest.stayzim.co.zw";

export type Email = {
  to: string;
  subject: string;
  /** Plain-text part; also what clients that can't show HTML display. */
  text: string;
  html?: string;
  replyTo?: string;
};

export function isMailConfigured(): boolean {
  return smtpOptions(env) !== null;
}

let transporter: Transporter | undefined;

/** Built on first use, so importing this package never needs SMTP to be configured. */
function getTransporter() {
  const options = smtpOptions(env);
  if (!options) return null;
  transporter ??= nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.auth,
    // A hung mail server must fail the request, not stall it
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return { transporter, from: options.from };
}

/**
 * Sends one email through the configured SMTP server. Without SMTP (local
 * development), the email is printed to the console so links can still be used.
 * Throws if the SMTP server rejects the message.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (email.to.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`)) return;
  const smtp = getTransporter();
  if (!smtp) {
    console.log(
      [
        "",
        "──── Email (SMTP not configured, not sent) ────",
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
    replyTo: email.replyTo,
  });
}

export type MailCheck = { ok: true } | { ok: false; error: string };

/**
 * Connects and logs in without sending anything, so a wrong host, port or
 * password shows up in the server log at boot rather than when an owner is
 * waiting for a reset link.
 */
export async function verifyMailConnection(): Promise<MailCheck> {
  const smtp = getTransporter();
  if (!smtp) return { ok: false, error: "SMTP_HOST and SMTP_FROM (or SMTP_USER) are not set" };
  try {
    await smtp.transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
