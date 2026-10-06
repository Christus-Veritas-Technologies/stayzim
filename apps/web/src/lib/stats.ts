import { formatClock, formatDate, formatShortDate, formatWeekday } from "@/lib/format";

export type Period = "today" | "7d" | "30d";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export type ChartPoint = { label: string; detail: string; current: number; previous: number };

export type VisitStats = {
  /** False until visit tracking on lodge sites is live (docs/progress.md, S8) */
  tracking: boolean;
  visitsToday: number;
  visitsYesterday: number;
  visits: number;
  previousVisits: number;
  bookingChats: number;
  previousBookingChats: number;
  countries: { code: string; name: string; share: number }[];
  chart: ChartPoint[];
};

/** Chart slots for a period: hours today, or days back from today. */
export function chartSlots(period: Period, now = new Date()): Omit<ChartPoint, "current" | "previous">[] {
  if (period === "today") {
    return Array.from({ length: 8 }, (_, index) => {
      const hour = new Date(now);
      hour.setHours(index * 3, 0, 0, 0);
      return { label: formatClock(hour), detail: `Today, ${formatClock(hour)}` };
    });
  }
  const days = period === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (days - 1 - index));
    return {
      label: period === "7d" ? formatWeekday(day, now) : String(day.getDate()),
      detail: formatDate(day),
    };
  });
}

/**
 * Visits for the dashboard. Lodge sites don't record visits yet, so this is
 * all zeros with `tracking: false`, and the screens say so instead of guessing.
 */
export function visitStats(period: Period): VisitStats {
  return {
    tracking: false,
    visitsToday: 0,
    visitsYesterday: 0,
    visits: 0,
    previousVisits: 0,
    bookingChats: 0,
    previousBookingChats: 0,
    countries: [],
    chart: chartSlots(period).map((slot) => ({ ...slot, current: 0, previous: 0 })),
  };
}

/** "Tue 29 Sep to today" */
export function periodRange(period: Period, now = new Date()) {
  if (period === "today") return "Today";
  const start = new Date(now);
  start.setDate(now.getDate() - (period === "7d" ? 6 : 29));
  return `${formatShortDate(start)} to today`;
}

export function previousLabel(period: Period) {
  return period === "today" ? "yesterday" : period === "7d" ? "the week before" : "the 30 days before";
}
