/**
 * Turns the SMTP environment into transport options. Kept free of imports so
 * the port/TLS rules can be reasoned about (and tested) on their own.
 */

export type SmtpEnv = {
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
};

/** The billing mailbox (billing@): its own login, on the same server unless it says otherwise. */
export type BillingSmtpEnv = SmtpEnv & {
  BILLING_SMTP_HOST?: string;
  BILLING_SMTP_PORT?: number;
  BILLING_SMTP_USER?: string;
  BILLING_SMTP_PASS?: string;
  BILLING_SMTP_FROM?: string;
};

/** Where replies to StayZim's own emails go: a person reads hello@. */
export const REPLY_TO = "hello@stayzim.co.zw";

export type SmtpOptions = {
  host: string;
  port: number;
  /** Implicit TLS from the first byte (port 465); otherwise STARTTLS is negotiated. */
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
};

/** Null when SMTP isn't set up: emails are then printed to the console instead of sent. */
export function smtpOptions(env: SmtpEnv): SmtpOptions | null {
  if (!env.SMTP_HOST) return null;
  // A bare address shows in inboxes as just "hello"; give it the brand name
  const from = env.SMTP_FROM ?? (env.SMTP_USER ? `StayZim <${env.SMTP_USER}>` : undefined);
  // Without a sender address every message would be refused anyway
  if (!from) return null;

  const port = env.SMTP_PORT ?? 587;
  return {
    host: env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 and 25 start plain and upgrade
    secure: port === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    from,
  };
}

/**
 * Invoices, reminders and receipts go from billing@ when BILLING_SMTP_USER is
 * set (host and port default to SMTP_HOST and SMTP_PORT). Null otherwise:
 * they then go from the main (no-reply) sender.
 */
export function billingSmtpOptions(env: BillingSmtpEnv): SmtpOptions | null {
  if (!env.BILLING_SMTP_USER) return null;
  return smtpOptions({
    SMTP_HOST: env.BILLING_SMTP_HOST ?? env.SMTP_HOST,
    SMTP_PORT: env.BILLING_SMTP_PORT ?? env.SMTP_PORT,
    SMTP_USER: env.BILLING_SMTP_USER,
    SMTP_PASS: env.BILLING_SMTP_PASS,
    SMTP_FROM: env.BILLING_SMTP_FROM ?? `StayZim Billing <${env.BILLING_SMTP_USER}>`,
  });
}
