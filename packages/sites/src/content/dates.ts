/**
 * Calendar dates for bookings, as "YYYY-MM-DD" strings. They are dates, never
 * instants, so a guest in London and an owner in Nyanga see the same nights.
 * Arithmetic runs on UTC midnight; "today" is today in Harare (UTC+2 all year).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HARARE_OFFSET_MS = 2 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date written as YYYY-MM-DD (so "2026-02-30" is not one). */
export function isDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function toTime(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

/** "2026-10-12" + 3 → "2026-10-15" */
export function dateAdd(date: string, days: number) {
  return fromTime(toTime(date) + days * DAY_MS);
}

/** Nights from check-in to check-out (the morning they leave). */
export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((toTime(checkOut) - toTime(checkIn)) / DAY_MS);
}

/** Every night of a stay: check-in up to, not including, check-out. */
export function eachNight(checkIn: string, checkOut: string) {
  const nights: string[] = [];
  for (let night = checkIn; night < checkOut; night = dateAdd(night, 1)) nights.push(night);
  return nights;
}

/** Whether two stays share a night. Leaving on the 12th and arriving on the 12th don't. */
export function staysOverlap(a: { checkIn: string; checkOut: string }, b: { checkIn: string; checkOut: string }) {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}

/** Today's date in Zimbabwe. */
export function todayInHarare(now: Date = new Date()) {
  return fromTime(now.getTime() + HARARE_OFFSET_MS);
}

/** The date `months` calendar months on (31 Jan + 1 → 28/29 Feb). */
export function dateAddMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromTime(target.getTime());
}

/** A Date from the database (a @db.Date column arrives as UTC midnight) as YYYY-MM-DD. */
export function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

/** YYYY-MM-DD as the Date Prisma stores in a @db.Date column. */
export function dateValue(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Oct" */
export function formatDay(date: string) {
  const [, month, day] = date.split("-").map(Number) as [number, number, number];
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

/** "12–15 Oct", "30 Oct – 2 Nov", "28 Dec 2026 – 2 Jan 2027" */
export function formatStay(checkIn: string, checkOut: string) {
  const [y1, m1, d1] = checkIn.split("-").map(Number) as [number, number, number];
  const [y2, m2, d2] = checkOut.split("-").map(Number) as [number, number, number];
  if (y1 !== y2) return `${d1} ${MONTHS_SHORT[m1 - 1]} ${y1} – ${d2} ${MONTHS_SHORT[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]}`;
  return `${d1}–${d2} ${MONTHS_SHORT[m1 - 1]}`;
}
