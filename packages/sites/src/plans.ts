import type { Plan } from "./index";

/**
 * What each plan costs and includes, shared by the server (Paynow amounts,
 * invoices), the web app (pricing, Billing) and the scripts.
 */

/** Monthly price in whole US dollars. */
export const PLAN_PRICES: Record<Plan, number> = { STARTER: 20, GROWTH: 40, PRO: 75 };

export const PLAN_ORDER: Plan[] = ["STARTER", "GROWTH", "PRO"];

/** A self-signed-up lodge is live as a demo for this long before it has to be paid for. */
export const DEMO_DAYS = 2;
/** After the paid period ends, the site stays up this many days (Payment due) before going offline. */
export const GRACE_DAYS = 3;
/** A demo that was never paid for is deleted this many days after it ended. */
export const DEMO_KEEP_DAYS = 30;

/** Months an owner can pay for at once. */
export const PAY_MONTHS = [1, 3, 12] as const;
export type PayMonths = (typeof PAY_MONTHS)[number];

export function isPlan(value: unknown): value is Plan {
  return value === "STARTER" || value === "GROWTH" || value === "PRO";
}

/** Percent off when paying for 12 months at once. */
export const ANNUAL_DISCOUNT: Record<Plan, number> = { STARTER: 10, GROWTH: 17, PRO: 30 };

/** What `months` cost, in whole dollars: 12 months take the plan's discount, rounded down. */
export function planPrice(plan: Plan, months = 1) {
  const full = PLAN_PRICES[plan] * months;
  return months === 12 ? Math.floor((full * (100 - ANNUAL_DISCOUNT[plan])) / 100) : full;
}

export function planPriceCents(plan: Plan, months = 1) {
  return planPrice(plan, months) * 100;
}

/** A year's price per month, rounded down ($216 a year is $18 a month). */
export function annualMonthlyPrice(plan: Plan) {
  return Math.floor(planPrice(plan, 12) / 12);
}

/** Dollars saved by paying for 12 months at once instead of month by month. */
export function annualSaving(plan: Plan) {
  return PLAN_PRICES[plan] * 12 - planPrice(plan, 12);
}

/**
 * Every paid plan comes with a free .co.zw domain that StayZim registers,
 * until DOMAIN_STILL_FREE is "false" (unset or anything else: still free).
 * Every paid plan can connect a domain it already has either way.
 */
export function domainStillFree(value: string | undefined) {
  return value?.trim().toLowerCase() !== "false";
}

/** A lodge that has paid (any plan) can claim it; a demo pays first, and an offline site comes back first. */
export function canClaimDomain(status: string) {
  return status === "ACTIVE" || status === "OVERDUE";
}

/** How long a claimed domain takes to set up (registering it, DNS, the certificate). */
export const DOMAIN_READY_HOURS = 72;

/**
 * The .co.zw name an owner asked for, tidied: "MistValley Lodge", "mistvalleylodge"
 * and "https://www.mistvalleylodge.co.zw/" all give "mistvalleylodge.co.zw".
 * Null when what's left isn't a usable name (3 to 63 letters, digits or hyphens).
 */
export function freeDomainName(input: string) {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.co\.zw$/, "")
    .replace(/[\s_]+/g, "");
  return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(name) && !name.includes("--") ? `${name}.co.zw` : null;
}

/** Visitor analytics come with Growth and Pro. */
export function includesAnalytics(plan: Plan) {
  return plan !== "STARTER";
}

/** The booking calendar (not built yet) will come with Growth and Pro. */
export function includesBookingCalendar(plan: Plan) {
  return plan !== "STARTER";
}
