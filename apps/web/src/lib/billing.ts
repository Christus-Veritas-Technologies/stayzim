/**
 * Paying by merchant code, for owners who'd rather (or while Paynow isn't
 * switched on): they pay with their lodge's slug as the reference, send proof
 * on WhatsApp, and StayZim records it with mark-paid (which emails a receipt).
 *
 * Merchant codes are placeholders until the accounts exist (docs/progress.md, "Blocked on").
 */
export const PAYMENT_METHODS = [
  { key: "ecocash", name: "EcoCash", short: "Ec", detail: "Merchant code 000000", copy: "000000", tone: "bg-danger-tint text-danger" },
  { key: "innbucks", name: "InnBucks", short: "Ib", detail: "Merchant code 000000", copy: "000000", tone: "bg-warning-tint text-warning" },
] as const;

export function formatMoney(dollars: number) {
  return `$${dollars.toFixed(2)}`;
}

/**
 * Who issues StayZim's invoices and receipts, printed on them. Fill in the
 * registered business details before launch (docs/progress.md, "Blocked on").
 */
export const STAYZIM_BUSINESS = {
  name: "StayZim",
  lines: ["Mutare, Zimbabwe"],
  email: "hello@stayzim.co.zw",
  website: "stayzim.co.zw",
};

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

export type BillingOverview = { paynow: boolean; invoices: Invoice[]; payments: Payment[] };

/** POST /api/lodge/billing/pay */
export type StartedPayment = { payment: Payment; redirectUrl: string | null; instructions: string | null; innbucksCode: string | null };

/** GET /api/lodge/billing/documents/:number: an invoice or a receipt, for printing. */
export type BillingDocument = {
  kind: "invoice" | "receipt";
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
