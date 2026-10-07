import type { Plan } from "./index";
import { GRACE_DAYS, PLAN_PRICES } from "./plans";

/**
 * Date rules for billing, in Zimbabwe time (Africa/Harare is UTC+2 all year,
 * no daylight saving). Pure functions, so the billing job is easy to test.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HARARE_OFFSET_MS = 2 * 60 * 60 * 1000;

/** Whole calendar days in Harare from `now` to `date` (0 = same day, negative = past). */
export function calendarDaysUntil(date: Date, now: Date) {
  const day = (value: Date) => Math.floor((value.getTime() + HARARE_OFFSET_MS) / DAY_MS);
  return day(date) - day(now);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Adds calendar months, keeping the time; 31 January + 1 month is 28 (or 29) February. */
export function addMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * The new paid-until date after paying for `months`: from the current paid-until
 * when it's still ahead (paying early loses nothing), else from now.
 */
export function extendPaidUntil(paidUntil: Date | null, now: Date, months: number) {
  const from = paidUntil && paidUntil.getTime() > now.getTime() ? paidUntil : now;
  return addMonths(from, months);
}

/**
 * The paid time left, moved to another plan at the two monthly prices, in
 * whole days (rounded down): 12 days of Growth ($40) are 6 days of Pro ($80),
 * 6 days of Pro are 12 of Growth. The same plan keeps every minute.
 */
export function carriedOverMs(paidUntil: Date | null, now: Date, from: Plan, to: Plan) {
  if (!paidUntil || paidUntil.getTime() <= now.getTime()) return 0;
  const left = paidUntil.getTime() - now.getTime();
  if (from === to) return left;
  return Math.floor((left * PLAN_PRICES[from]) / PLAN_PRICES[to] / DAY_MS) * DAY_MS;
}

/**
 * The paid-until date after paying `months` of `to`: the time left on the
 * current plan, carried over at the new plan's price (carriedOverMs), then the
 * months paid for. Same plan: the same as extendPaidUntil.
 */
export function paidUntilAfterPayment(lodge: { paidUntil: Date | null; plan: Plan }, to: Plan, months: number, now: Date) {
  return addMonths(new Date(now.getTime() + carriedOverMs(lodge.paidUntil, now, lodge.plan, to)), months);
}

export type NoticeKind = "DUE_IN_3" | "DUE_IN_1" | "DUE_TODAY";

/**
 * Which invoice reminder is due now: 3 days before (or 2, if the job missed
 * day 3), the day before, and the day itself. Only the current window counts,
 * so a late run never sends a stale reminder.
 */
export function noticeFor(dueAt: Date, now: Date): NoticeKind | null {
  const days = calendarDaysUntil(dueAt, now);
  if (days === 3 || days === 2) return "DUE_IN_3";
  if (days === 1) return "DUE_IN_1";
  if (days === 0) return "DUE_TODAY";
  return null;
}

export type BillingStatus = "DEMO" | "ACTIVE" | "OVERDUE" | "SUSPENDED";

/**
 * What a paying lodge's status should be now: Payment due once the paid period
 * is over, offline GRACE_DAYS later. Demos and lodges without a paid-until date
 * (the landing page's sample lodges) keep theirs; so does a suspension, which
 * only a payment lifts.
 */
export function statusFor(lodge: { status: BillingStatus; paidUntil: Date | null }, now: Date): BillingStatus {
  if (lodge.status === "DEMO" || lodge.status === "SUSPENDED" || !lodge.paidUntil) return lodge.status;
  if (now.getTime() >= addDays(lodge.paidUntil, GRACE_DAYS).getTime()) return "SUSPENDED";
  if (now.getTime() >= lodge.paidUntil.getTime()) return "OVERDUE";
  return "ACTIVE";
}

/** A demo whose time is up. Its site is offline until it's paid for. */
export function demoEnded(lodge: { status: BillingStatus; demoEndsAt: Date | null }, now: Date) {
  return lodge.status === "DEMO" && lodge.demoEndsAt !== null && lodge.demoEndsAt.getTime() <= now.getTime();
}

const HARARE = "Africa/Harare";

function harareParts(date: Date, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: HARARE, ...options }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** "Thursday 8 October" in Zimbabwe time, for emails, invoices and receipts. */
export function formatHarareDate(date: Date) {
  const parts = harareParts(date, { weekday: "long", day: "numeric", month: "long" });
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

/** "8 October 2026" in Zimbabwe time. */
export function formatHarareDay(date: Date) {
  const parts = harareParts(date, { day: "numeric", month: "long", year: "numeric" });
  return `${parts.day} ${parts.month} ${parts.year}`;
}

/** "Thursday 8 October at 14:30" in Zimbabwe time. */
export function formatHarareDateTime(date: Date) {
  const parts = harareParts(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${formatHarareDate(date)} at ${parts.hour}:${parts.minute}`;
}

/** 4000 → "$40.00" */
export function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
