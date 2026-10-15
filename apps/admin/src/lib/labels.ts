import type { AgentStage, LeadSource, OutreachStatus, Plan, SiteState } from "@/lib/types";

type BadgeVariant = "neutral" | "brand" | "success" | "purple" | "warning" | "danger";

export const PLAN_NAMES: Record<Plan, string> = { STARTER: "Starter", GROWTH: "Growth", PRO: "Pro" };

export const SITE_STATES: Record<SiteState, { label: string; badge: BadgeVariant }> = {
  PREVIEW: { label: "Free preview", badge: "purple" },
  PREVIEW_ENDED: { label: "Preview ended", badge: "neutral" },
  ACTIVE: { label: "Active", badge: "success" },
  OVERDUE: { label: "Payment due", badge: "warning" },
  SUSPENDED: { label: "Offline", badge: "danger" },
};

export const OUTREACH_STATUSES: Record<OutreachStatus, { label: string; badge: BadgeVariant }> = {
  PENDING: { label: "Not messaged", badge: "neutral" },
  REACHED: { label: "Messaged", badge: "brand" },
  REPLIED: { label: "Replied", badge: "success" },
  NOT_ON_WHATSAPP: { label: "Not on WhatsApp", badge: "warning" },
  FAILED: { label: "Send failed", badge: "danger" },
  DO_NOT_CONTACT: { label: "Do not contact", badge: "danger" },
};

export const LEAD_SOURCES: Record<LeadSource, string> = { meta_form: "Facebook form", list: "Outreach list", manual: "Added by hand", whatsapp: "Messaged us (ad)" };

/** Where the WhatsApp sales agent is with a lead */
export const AGENT_STAGES: Record<AgentStage, { label: string; badge: BadgeVariant }> = {
  NEW: { label: "New", badge: "neutral" },
  DETAILS: { label: "Agent: getting details", badge: "brand" },
  BUILDING: { label: "Agent: building", badge: "brand" },
  OFFER: { label: "Agent: sites sent", badge: "purple" },
  CHOSEN: { label: "Agent: chose a site", badge: "purple" },
  PAYING: { label: "Agent: paying", badge: "warning" },
  PAID: { label: "Paid", badge: "success" },
  HANDOVER: { label: "Needs you", badge: "danger" },
  DISQUALIFIED: { label: "Not a fit (ignored)", badge: "neutral" },
};

export const AGENT_FILTERS = {
  all: "Agent: everyone",
  talking: "Agent: talking",
  needs_you: "Needs you",
  paying: "Paying",
  paid: "Paid",
  disqualified: "Not a fit (ignored)",
} as const;

/** "263771234567" → "+263 77 123 4567" (Zimbabwe numbers); others get a + and stay as they are. */
export function formatPhone(digits: string) {
  const zw = digits.match(/^263(\d{2})(\d{3})(\d{4})$/);
  return zw ? `+263 ${zw[1]} ${zw[2]} ${zw[3]}` : `+${digits}`;
}

export const CHANNELS = [
  { value: "ecocash", label: "EcoCash" },
  { value: "innbucks", label: "InnBucks" },
  { value: "onemoney", label: "OneMoney" },
  { value: "paynow", label: "Paynow" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
] as const;
