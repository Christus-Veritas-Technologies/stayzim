import { env } from "@stayzim/env/admin";

/**
 * The API (apps/server) as the team account, for the sales agent's tools:
 * making sites, their photos, payment links, claim links. Same routes the
 * admin's pages and scripts/make-sites.ts use, with ADMIN_API_TOKEN.
 */

const API = (env.SERVER_INTERNAL_URL ?? env.NEXT_PUBLIC_SERVER_URL).replace(/\/$/, "");

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  if (auth && !env.ADMIN_API_TOKEN) throw new Error("ADMIN_API_TOKEN isn't set on the admin app");
  const isForm = body instanceof FormData;
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${env.ADMIN_API_TOKEN}` } : {}),
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      // The public pay routes check the origin like a browser's
      Origin: env.NEXT_PUBLIC_WEB_URL,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new ApiError(data.error ?? `${method} ${path} said ${response.status}`, response.status);
  return data;
}

/** The API said no: its message, and the status (503: paying online is off; 502: Paynow refused or didn't answer) */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type LinkPayment = {
  id: string;
  reference: string;
  amountCents: number;
  channel: string;
  channelName: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  receiptNumber: string | null;
};

/** A payment link and its latest payments, newest first (GET /api/admin/payment-links/:token) */
export type LinkStatus = {
  link: { url: string; state: "open" | "paid" | "expired"; siteUrl: string; paidUntil: string | null; amountCents: number; months: number; lodgeName: string };
  payments: LinkPayment[];
};

export type MadeSite = { slug: string; plan: "STARTER" | "GROWTH" | "PRO"; monthlyPrice: number; url: string; name: string };

export const serverApi = {
  makeSites: (input: { name: string; town: string; whatsapp: string; contactName?: string; email?: string; kind?: string; plans: string[]; previewDays?: number }) =>
    call<{ leadId: string; sites: MadeSite[] }>("POST", "/api/admin/sites", input),

  uploadPhoto: (slug: string, form: FormData) => call<unknown>("POST", `/api/admin/sites/${slug}/photos`, form),

  paymentLink: (slug: string, months: number) =>
    call<{ url: string; amountCents: number; months: number; plan: string; state: string }>("POST", `/api/admin/sites/${slug}/payment-link`, { months }),

  /** Brings an ended free preview back online (or pushes a running one out) by this many days */
  extendPreview: (slug: string, days: number) => call<unknown>("PATCH", `/api/admin/sites/${slug}`, { extendPreviewDays: days }),

  claimLink: (leadId: string, slug: string) => call<{ url: string; expiresAt: string }>("POST", `/api/admin/leads/${leadId}/sites/${slug}/claim-link`),

  /** A prompt on their phone for what the link says (EcoCash or OneMoney), through Paynow: the team's route, not the pay page's per-visitor limit */
  startPayment: (token: string, channel: "ecocash" | "onemoney", phone: string) =>
    call<{ payment: LinkPayment; instructions: string | null }>("POST", `/api/admin/payment-links/${token}/payments`, { channel, phone }),

  /** How the link is going: paid, open or expired, and its payments (pending ones checked with Paynow first; fresh: even if just asked) */
  linkStatus: (token: string, fresh = false) => call<LinkStatus>("GET", `/api/admin/payment-links/${token}${fresh ? "?fresh=1" : ""}`),
};
