import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatClock, formatDate, formatShortDate, formatWeekday } from "@/lib/format";

export type Period = "today" | "7d" | "30d";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export type ChartPoint = { label: string; detail: string; current: number; previous: number };

export type Country = { code: string; name: string; share: number };

export type VisitStats = {
  tracking: boolean;
  visitsToday: number;
  visitsYesterday: number;
  visits: number;
  previousVisits: number;
  bookingChats: number;
  previousBookingChats: number;
  /** The top two and "Other", by share of visits whose country is known */
  countries: Country[];
  chart: ChartPoint[];
};

/** GET /api/lodge/stats (apps/server/src/routes/stats.ts) */
type StatsResponse = Omit<VisitStats, "countries" | "chart"> & {
  countries: { code: string; share: number }[];
  chart: { start: string; current: number; previous: number }[];
};

/** Days and hours on the charts are Zimbabwe time (UTC+2), wherever the owner is. */
const ZIMBABWE_OFFSET_MS = 2 * 60 * 60 * 1000;

/** A Date whose local fields read as the time in Zimbabwe, for the format helpers. */
function inZimbabwe(date: Date | string) {
  const shifted = new Date(new Date(date).getTime() + ZIMBABWE_OFFSET_MS);
  return new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), shifted.getUTCHours(), shifted.getUTCMinutes());
}

let regionNames: Intl.DisplayNames | null | undefined;

/** "Zimbabwe" for "ZW". Visitors' countries come as ISO codes from Cloudflare. */
export function countryName(code: string | null) {
  if (!code) return "Not known";
  if (code === "Other") return "Other";
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function chartLabels(period: Period, start: string, now: Date) {
  const at = inZimbabwe(start);
  if (period === "today") return { label: formatClock(at), detail: `Today, ${formatClock(at)}` };
  return { label: period === "7d" ? formatWeekday(at, now) : String(at.getDate()), detail: formatDate(at) };
}

function fromResponse(period: Period, response: StatsResponse): VisitStats {
  const now = inZimbabwe(new Date());
  return {
    ...response,
    countries: response.countries.map((country) => ({ ...country, name: countryName(country.code) })),
    chart: response.chart.map((point) => ({ ...chartLabels(period, point.start, now), current: point.current, previous: point.previous })),
  };
}

export type StatsState = {
  /** The latest numbers; while another period loads, the last period's stay on screen */
  stats: VisitStats | null;
  loading: boolean;
  /** Starter: visitor analytics come with Growth */
  locked: boolean;
  error: string | null;
  retry: () => void;
};

/** Visits for the overview and Analytics, from /api/lodge/stats. Pass `enabled: false` on Starter. */
export function useVisitStats(period: Period, enabled = true): StatsState {
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [locked, setLocked] = useState(!enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLocked(true);
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    setError(null);
    void api<StatsResponse>(`/api/lodge/stats?period=${period}`).then((result) => {
      if (!current) return;
      setLoading(false);
      if (result.error === undefined) {
        setStats(fromResponse(period, result.data));
        setLocked(false);
      } else if (result.status === 403) setLocked(true);
      else setError(result.error);
    });
    return () => {
      current = false;
    };
  }, [attempt, enabled, period]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { stats, loading, locked, error, retry };
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

/** A device as owners say it. */
export const DEVICE_LABEL = { PHONE: "Phone", TABLET: "Tablet", COMPUTER: "Computer" } as const;

export type Device = keyof typeof DEVICE_LABEL;

/** GET /api/lodge/activity and /visits: one visit or booking chat. */
export type SiteVisit = {
  id: string;
  type: "PAGE_VIEW" | "BOOKING_CHAT";
  createdAt: string;
  country: string | null;
  device: Device;
  path: string;
  room: string | null;
  browser?: string | null;
  ip?: string | null;
};
