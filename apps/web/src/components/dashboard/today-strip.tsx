"use client";

import { CalendarCheck2 } from "lucide-react";
import Link from "next/link";

import { PageSection } from "@/components/dashboard/page";
import type { Lodge } from "@/lib/lodge";

/** "2 arriving · 1 leaving · 3 staying" for today, when there's anything. */
export function TodayStrip({ lodge, onRequests }: { lodge: Lodge; onRequests?: () => void }) {
  const { arriving, leaving, staying } = lodge.today;
  if (arriving + leaving + staying + lodge.bookingsWaiting === 0) return null;
  const parts = [
    arriving > 0 && `${arriving} arriving`,
    leaving > 0 && `${leaving} leaving`,
    staying > 0 && `${staying} staying`,
  ].filter(Boolean);
  return (
    <PageSection>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-brand-wash px-4 py-3 text-[13.5px]">
        <span className="inline-flex items-center gap-2 font-semibold text-brand-dark">
          <CalendarCheck2 className="size-4" />
          Today
        </span>
        <span className="text-ink-2">{parts.length > 0 ? parts.join(" · ") : "No arrivals or departures"}</span>
        {lodge.bookingsWaiting > 0 ? (
          onRequests ? (
            <button type="button" onClick={onRequests} className="ml-auto font-semibold text-purple hover:text-purple-dark">
              {lodge.bookingsWaiting} {lodge.bookingsWaiting === 1 ? "request" : "requests"} waiting
            </button>
          ) : (
            <Link href={{ pathname: "/dashboard/bookings", query: { tab: "requests" } }} className="ml-auto font-semibold text-purple hover:text-purple-dark">
              {lodge.bookingsWaiting} {lodge.bookingsWaiting === 1 ? "request" : "requests"} waiting
            </Link>
          )
        ) : null}
      </div>
    </PageSection>
  );
}

