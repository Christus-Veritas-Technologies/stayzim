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


export type BillingOverview = { paynow: boolean; invoices: Invoice[]; payments: Payment[] };

/** Who issues invoices and receipts (apps/server/src/lib/business.ts). */
export type Issuer = { name: string; website: string; email: string; phone: string };

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
  /** Receipts: the site is live until then thanks to this payment */
  coversUntil?: string | null;
  /** Receipts: the plan the lodge moved from, when this payment changed it */
  previousPlan?: "STARTER" | "GROWTH" | "PRO" | null;
  /** Receipts: the design that went live with it (picked for a cheaper plan) */
  template?: string | null;
};

/** The ways to pay, all through Paynow: a prompt on the phone, an InnBucks code, or Paynow's own page (cards and more). */
export const PAY_CHANNELS = [
  { key: "ecocash", name: "EcoCash", how: "Prompt on your phone", prompt: true },
  { key: "innbucks", name: "InnBucks", how: "Code for the app", prompt: true },
  { key: "onemoney", name: "OneMoney", how: "Prompt on your phone", prompt: true },
  { key: "web", name: "Card & more", how: "On Paynow's page", prompt: false },
] as const;
export type PayChannel = (typeof PAY_CHANNELS)[number]["key"];

/** 4000 → "$40.00" */
export function formatCents(cents: number) {
  return formatMoney(cents / 100);
}
