/** Tones for the merchant code cards (the codes come from the API: ECOCASH_MERCHANT_CODE, INNBUCKS_MERCHANT_CODE). */
export const MERCHANT_TONES = {
  ecocash: { short: "Ec", tone: "bg-danger-tint text-danger" },
  innbucks: { short: "Ib", tone: "bg-warning-tint text-warning" },
} as const;

export function formatMoney(dollars: number) {
  return `$${dollars.toFixed(2)}`;
}

/** GET /api/lodge/billing (apps/server/src/routes/billing.ts) */
export type Invoice = {
  id: string;
  number: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  amountCents: number;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  status: "OPEN" | "PAID";
  paidAt: string | null;
};

export type Payment = {
  id: string;
  reference: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  months: number;
  amountCents: number;
  method: "PAYNOW" | "MANUAL";
  channel: string;
  channelName: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  receiptNumber: string | null;
  paidAt: string | null;
  createdAt: string;
};

/** StayZim's merchant codes for paying outside Paynow; only those set on the server. */
export type MerchantCode = { key: keyof typeof MERCHANT_TONES; name: string; code: string };

export type BillingOverview = { paynow: boolean; merchantCodes: MerchantCode[]; invoices: Invoice[]; payments: Payment[] };

/** Who issues invoices and receipts (BUSINESS_* on the server). */
export type Issuer = { name: string; lines: string[]; email: string; taxNumber: string | null; website: string };

/** POST /api/lodge/billing/pay */
export type StartedPayment = { payment: Payment; redirectUrl: string | null; instructions: string | null; innbucksCode: string | null };

/** GET /api/lodge/billing/documents/:number: an invoice or a receipt, for printing. */
export type BillingDocument = {
  kind: "invoice" | "receipt";
  issuer: Issuer;
  number: string;
  issuedAt: string;
  billedTo: { lodge: string; slug: string; place: string | null; name: string; email: string };
  plan: "STARTER" | "GROWTH" | "PRO";
  months: number;
  amountCents: number;
  status: "OPEN" | "PAID";
  paidAt: string | null;
  periodStart?: string;
  periodEnd?: string;
  dueAt?: string;
  reference?: string;
  channelName?: string;
};

export const PAY_CHANNELS = [
  { key: "ecocash", name: "EcoCash", short: "Ec", tone: "bg-danger-tint text-danger", prompt: true },
  { key: "innbucks", name: "InnBucks", short: "Ib", tone: "bg-warning-tint text-warning", prompt: true },
  { key: "onemoney", name: "OneMoney", short: "1M", tone: "bg-brand-wash text-brand", prompt: true },
  { key: "web", name: "Card & more", short: "Pn", tone: "bg-surface-2 text-slate", prompt: false },
] as const;
export type PayChannel = (typeof PAY_CHANNELS)[number]["key"];

/** 4000 → "$40.00" */
export function formatCents(cents: number) {
  return formatMoney(cents / 100);
}
