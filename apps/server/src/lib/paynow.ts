import { env } from "@stayzim/env/server";

/**
 * Paynow (paynow.co.zw), written against its form protocol, as the official
 * `paynow` npm SDK does it (same hash, same fields), without its dependencies:
 *
 * - Every request and response is form-encoded fields plus `hash`: SHA-512 of
 *   the other values joined in order, then the integration key in lowercase,
 *   as uppercase hex.
 * - Web checkout (initiatetransaction) answers with a page to send the owner to;
 *   a mobile payment (remotetransaction) sends a prompt to their phone. Both
 *   answer with a poll URL, which says how the payment is going.
 * - Paynow also POSTs that status to our result URL when it changes.
 *
 * Values we send never contain characters URL-encoding would change, so the
 * hash is the same however each side encodes them.
 */

export const paynowEnabled = Boolean(env.PAYNOW_INTEGRATION_ID && env.PAYNOW_INTEGRATION_KEY);

/** How an owner pays on Paynow: a prompt on their phone (EcoCash, OneMoney), a code (InnBucks), or Paynow's page (cards and the rest). */
export const MOBILE_CHANNELS = ["ecocash", "onemoney", "innbucks"] as const;
export type MobileChannel = (typeof MOBILE_CHANNELS)[number];

export type PaynowFields = Record<string, string>;

export function paynowHash(fields: PaynowFields, key: string) {
  const joined =
    Object.entries(fields)
      .filter(([name]) => name.toLowerCase() !== "hash")
      .map(([, value]) => value)
      .join("") + key.toLowerCase();
  return new Bun.CryptoHasher("sha512").update(joined).digest("hex").toUpperCase();
}

/** Fields from a Paynow response or result POST, in the order they came (the hash depends on it). */
export function parsePaynowFields(body: string): PaynowFields {
  const fields: PaynowFields = {};
  for (const pair of body.trim().split("&")) {
    if (!pair) continue;
    const [name = "", value = ""] = pair.split("=");
    const decode = (text: string) => decodeURIComponent(text.replace(/\+/g, "%20"));
    fields[decode(name).toLowerCase()] = decode(value);
  }
  return fields;
}

export function verifyPaynowHash(fields: PaynowFields, key = env.PAYNOW_INTEGRATION_KEY ?? "") {
  return Boolean(fields.hash) && Boolean(key) && fields.hash!.toUpperCase() === paynowHash(fields, key);
}

/** Paynow's status words: Paid, Awaiting Delivery, Delivered, Created, Sent, Cancelled, Failed, Disputed, Refunded… */
export function paymentOutcome(status: string | undefined): "PAID" | "PENDING" | "FAILED" | "CANCELLED" {
  const value = (status ?? "").toLowerCase();
  if (value === "paid" || value === "awaiting delivery" || value === "delivered") return "PAID";
  if (value === "cancelled") return "CANCELLED";
  if (value === "failed" || value === "disputed" || value === "refunded") return "FAILED";
  return "PENDING";
}

type Started =
  | { ok: true; pollUrl: string; redirectUrl?: string; instructions?: string; innbucksCode?: string; paynowReference?: string }
  | { ok: false; error: string };

async function post(url: string, fields: PaynowFields | null): Promise<PaynowFields> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: fields ? new URLSearchParams(fields).toString() : "",
    signal: AbortSignal.timeout(20_000),
  });
  return parsePaynowFields(await response.text());
}

function started(fields: PaynowFields): Started {
  if ((fields.status ?? "").toLowerCase() !== "ok") return { ok: false, error: fields.error || "Paynow couldn't start the payment." };
  if (!verifyPaynowHash(fields)) return { ok: false, error: "Paynow's answer didn't check out. Try again." };
  return {
    ok: true,
    pollUrl: fields.pollurl ?? "",
    redirectUrl: fields.browserurl,
    instructions: fields.instructions,
    innbucksCode: fields.authorizationcode,
    paynowReference: fields.paynowreference,
  };
}

/** Our reference, amount and "what for", the same for both kinds of payment. */
function baseFields(input: { reference: string; amountCents: number; info: string; email: string; resultUrl: string; returnUrl: string }) {
  return {
    resulturl: input.resultUrl,
    returnurl: input.returnUrl,
    reference: input.reference,
    amount: (input.amountCents / 100).toFixed(2),
    id: env.PAYNOW_INTEGRATION_ID ?? "",
    additionalinfo: input.info.replace(/[^A-Za-z0-9-]+/g, "-"),
    authemail: env.PAYNOW_AUTH_EMAIL ?? input.email,
  };
}

function signed(fields: PaynowFields) {
  return { ...fields, hash: paynowHash(fields, env.PAYNOW_INTEGRATION_KEY ?? "") };
}

/** Paynow's checkout page (cards, and every other way to pay). */
export async function startWebPayment(input: Parameters<typeof baseFields>[0]): Promise<Started> {
  const fields = signed({ ...baseFields(input), status: "Message" });
  return started(await post(`${env.PAYNOW_API_URL}/interface/initiatetransaction`, fields));
}

/** A prompt on the owner's phone (EcoCash, OneMoney), or a code for the InnBucks app. */
export async function startMobilePayment(input: Parameters<typeof baseFields>[0] & { phone: string; channel: MobileChannel }): Promise<Started> {
  const fields = signed({ ...baseFields(input), phone: input.phone, method: input.channel, status: "Message" });
  return started(await post(`${env.PAYNOW_API_URL}/interface/remotetransaction`, fields));
}

/** Asks Paynow how a payment is going. Null when the answer can't be trusted. */
export async function pollPayment(pollUrl: string) {
  const fields = await post(pollUrl, null);
  if ((fields.status ?? "").toLowerCase() === "error" || !verifyPaynowHash(fields)) return null;
  return { reference: fields.reference, amount: fields.amount, paynowReference: fields.paynowreference, outcome: paymentOutcome(fields.status) };
}
