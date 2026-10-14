/** The API's answers (apps/server/src/routes/admin-console.ts and admin-leads.ts), as the screens use them. */

export type Plan = "STARTER" | "GROWTH" | "PRO";
export type SiteState = "PREVIEW" | "PREVIEW_ENDED" | "ACTIVE" | "OVERDUE" | "SUSPENDED";

export type SiteRow = {
  id: string;
  name: string;
  slug: string;
  url: string;
  town: string | null;
  plan: Plan;
  status: "DEMO" | "ACTIVE" | "OVERDUE" | "SUSPENDED";
  state: SiteState;
  previewEndsAt: string | null;
  paidUntil: string | null;
  founding: boolean;
  monthlyPrice: number;
  template: string | null;
  createdAt: string;
  source: string | null;
  lead: { id: string; name: string } | null;
  owner: { id: string; name: string; email: string | null; guest: boolean; team: boolean };
  rooms: number;
  photos: number;
};

/** A site's latest payment link (stayzim.co.zw/pay/…): one amount, paid without signing in. */
export type PaymentLink = {
  url: string;
  plan: Plan;
  months: number;
  amountCents: number;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  state: "open" | "paid" | "expired";
};

export type Invoice = { id: string; number: string; plan: Plan; amountCents: number; status: "OPEN" | "PAID" | "VOID"; dueAt: string; paidAt: string | null; periodStart?: string; periodEnd?: string };

export type Payment = {
  id: string;
  reference: string;
  receiptNumber: string | null;
  plan: Plan;
  months: number;
  amountCents: number;
  method: "PAYNOW" | "MANUAL";
  channel: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  paidAt: string | null;
  createdAt: string;
  note?: string | null;
};

export type SiteDetail = SiteRow & {
  whatsapp: string | null;
  email: string | null;
  place: string;
  kind: string | null;
  setting: string | null;
  customDomain: string | null;
  heroUrl: string | null;
  normalPrice: number;
  utm: { source: string | null; medium: string | null; campaign: string | null; content: string | null; referrer: string | null };
  linkSharedAt: string | null;
  claimLinkExpiresAt: string | null;
  paymentLink: PaymentLink | null;
  domainClaim: { domain: string; status: "REQUESTED" | "READY"; createdAt: string; readyAt: string | null } | null;
  invoices: Invoice[];
  payments: Payment[];
  requests: { id: string; reference: string; topic: string; message: string; status: string; createdAt: string }[];
  counts: { rooms: number; photos: number; bookings: number; reviews: number; posts: number; visits30: number };
};

export type Overview = {
  signups: { today: number; week: number; month: number };
  users: { owners: number; guests: number; team: number };
  sites: Record<SiteState, number> & { founding: number; leadSites: number };
  money: { mrrCents: number; paid30Cents: number; paid30Count: number; pending: number };
  sources: { source: string; sites: number }[];
  funnel: { step: string; visitors: number }[];
  leads: number;
  recentSites: SiteRow[];
  recentPayments: { id: string; amountCents: number; plan: Plan; months: number; channel: string; paidAt: string; lodge: { name: string; slug: string } }[];
};

export type UserRow = {
  id: string;
  name: string;
  email: string | null;
  role: "OWNER" | "ADMIN";
  guest: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  signIn: string[];
  lodge: { name: string; slug: string; plan: Plan; state: SiteState } | null;
};

export type Paged<K extends string, T> = { total: number; page: number; pageSize: number } & Record<K, T[]>;

export type OutreachStatus = "PENDING" | "REACHED" | "REPLIED" | "NOT_ON_WHATSAPP" | "FAILED" | "DO_NOT_CONTACT";
export type LeadSource = "meta_form" | "list" | "manual";

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  city: string;
  source: LeadSource | null;
  lodgeName: string | null;
  email: string | null;
  notes: string;
  status: OutreachStatus;
  reachedVia: string | null;
  lastContactedAt: string | null;
  lastRepliedAt: string | null;
  createdAt: string;
  sites: { slug: string; plan: Plan; claimed: boolean }[];
  lastReply: { body: string; createdAt: string } | null;
};

export type LeadSite = {
  id: string;
  name: string;
  slug: string;
  url: string;
  plan: Plan;
  template: string | null;
  founding: boolean;
  monthlyPrice: number;
  normalPrice: number;
  status: string;
  previewEndsAt: string | null;
  createdAt: string;
  claimed: boolean;
  ownerEmail: string | null;
  claimLinkExpiresAt: string | null;
  paymentLink: PaymentLink | null;
  photos: number;
};

export type ConversationItem = {
  id: string;
  direction: "out" | "in";
  body: string;
  account: string;
  status: "SENT" | "NOT_ON_WHATSAPP" | "FAILED" | null;
  error: string | null;
  type?: string;
  at: string;
};

export type LeadDetail = Omit<LeadRow, "sites" | "lastReply"> & { sites: LeadSite[]; conversation: ConversationItem[] };
