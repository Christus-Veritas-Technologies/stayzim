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

export function planPriceCents(plan: Plan, months = 1) {
  return PLAN_PRICES[plan] * 100 * months;
}

/** Growth and Pro come with a free .co.zw domain (StayZim registers it). Every paid plan can connect its own. */
export function includesFreeDomain(plan: Plan) {
  return plan !== "STARTER";
}

/** Visitor analytics come with Growth and Pro. */
export function includesAnalytics(plan: Plan) {
  return plan !== "STARTER";
}

/** The booking calendar (not built yet) will come with Growth and Pro. */
export function includesBookingCalendar(plan: Plan) {
  return plan !== "STARTER";
}
