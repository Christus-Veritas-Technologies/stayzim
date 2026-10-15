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
  if (!response.ok) throw new Error(data.error ?? `${method} ${path} said ${response.status}`);
  return data;
}

export type MadeSite = { slug: string; plan: "STARTER" | "GROWTH" | "PRO"; monthlyPrice: number; url: string; name: string };

export const serverApi = {
  makeSites: (input: { name: string; town: string; whatsapp: string; contactName?: string; email?: string; kind?: string; plans: string[] }) =>
    call<{ leadId: string; sites: MadeSite[] }>("POST", "/api/admin/sites", input),

  uploadPhoto: (slug: string, form: FormData) => call<unknown>("POST", `/api/admin/sites/${slug}/photos`, form),

  paymentLink: (slug: string, months: number) =>
    call<{ url: string; amountCents: number; months: number; plan: string; state: string }>("POST", `/api/admin/sites/${slug}/payment-link`, { months }),

  claimLink: (leadId: string, slug: string) => call<{ url: string; expiresAt: string }>("POST", `/api/admin/leads/${leadId}/sites/${slug}/claim-link`),

  /** The public pay routes behind a payment link (no token) */
  startPayment: (token: string, channel: "ecocash" | "onemoney" | "innbucks" | "web", phone?: string) =>
    call<{ payment: { id: string; reference: string; amountCents: number; status: string }; redirectUrl: string | null; instructions: string | null; innbucksCode: string | null }>(
      "POST",
      `/api/pay/${token}`,
      { channel, phone },
      false,
    ),

  paymentStatus: (token: string, paymentId: string) =>
    call<{ payment: { id: string; status: "PENDING" | "PAID" | "FAILED" | "CANCELLED"; amountCents: number; receiptNumber: string | null }; link: { paidUntil: string | null; siteUrl: string } }>(
      "GET",
      `/api/pay/${token}/payments/${paymentId}`,
      undefined,
      false,
    ),
};
