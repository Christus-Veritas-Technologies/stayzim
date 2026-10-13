import type { LeadSource, OutreachStatus, Plan, SiteState } from "@/lib/types";

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

export const LEAD_SOURCES: Record<LeadSource, string> = { meta_form: "Facebook form", list: "Outreach list", manual: "Added by hand" };

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
