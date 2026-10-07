"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { BarChart3, CalendarDays, Eye, Globe2, Lock, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import { LeadStatCard, PlainStatCard, Trend, TrayStatCard } from "@/components/dashboard/stat-card";
import { VisitsChart } from "@/components/dashboard/visits-chart";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { PLANS } from "@/lib/lodge";
import { periodLabel, PERIODS, periodRange, previousLabel, type Period, type VisitStats } from "@/lib/stats";
import { stayzimChatUrl } from "@/lib/whatsapp";

/** Today / 7 days / 30 days. A grey track on phones, plain pills on desktop. */
export function PeriodTabs({
  value,
  onChange,
  periods = PERIODS,
  className,
}: {
  value: Period;
  onChange: (period: Period) => void;
  periods?: typeof PERIODS;
  className?: string;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as Period)} className={className}>
      <TabsList aria-label="Period" className="max-sm:w-full max-sm:rounded-full max-sm:bg-surface-2 max-sm:p-1 max-sm:*:data-[slot=tabs-tab]:flex-1">
        {periods.map((period) => (
          <TabsTab key={period.value} value={period.value}>
            {period.label}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Visits today, this period, booking chats, and where visitors are. Skeletons until the first numbers arrive. */
export function StatCards({ stats, period, loading = false }: { stats: VisitStats | null; period: Period; loading?: boolean }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4" aria-busy="true" aria-label="Loading visits">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[150px] rounded-[20px]" />
        ))}
      </div>
    );
  }
  const top = stats.countries[0];
  return (
    <div className={cn("grid grid-cols-2 gap-3 transition-opacity duration-300 lg:gap-4 xl:grid-cols-4", loading && "opacity-60")} aria-busy={loading || undefined}>
      <LeadStatCard
        icon={Eye}
        label="Visits today"
        value={stats.visitsToday}
        badge={stats.visitsToday > stats.visitsYesterday ? <Trend current={stats.visitsToday} previous={stats.visitsYesterday} inverse /> : null}
        note={`${stats.visitsYesterday} yesterday`}
      />
      <TrayStatCard
        tone="brand"
        icon={CalendarDays}
        label={periodLabel(period)}
        value={stats.visits}
        badge={<Trend current={stats.visits} previous={stats.previousVisits} />}
        foot={`${stats.previousVisits} ${previousLabel(period)}`}
      />
      <TrayStatCard
        tone="purple"
        icon={MessageCircle}
        label="Bookings and chats"
        value={stats.bookingChats + stats.bookingRequests}
        badge={<Trend current={stats.bookingChats + stats.bookingRequests} previous={stats.previousBookingChats + stats.previousBookingRequests} />}
        foot={`${stats.bookingRequests} on your site · ${stats.bookingChats} on WhatsApp`}
      />
      <PlainStatCard icon={Globe2} label="Where visitors are">
        {top ? (
          <>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              {stats.countries.slice(0, 3).map((country, index) => (
                <span
                  key={country.code}
                  title={`${country.name} ${country.share}%`}
                  className={cn("transition-[width] duration-700", index === 0 ? "bg-rust" : index === 1 ? "bg-clay" : "bg-peach")}
                  style={{ width: `${country.share}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between gap-2 text-[12.5px] text-slate">
              {stats.countries.slice(0, 3).map((country) => (
                <span key={country.code} title={country.name}>
                  {country.code === "Other" ? "Other" : country.code} <strong className="font-semibold">{country.share}%</strong>
                </span>
              ))}
            </div>
            <p className="truncate text-[12px] text-muted">Most visit from {top.code === "Other" ? "several countries" : top.name}</p>
          </>
        ) : (
          <>
            <div className="h-2 rounded-full bg-line-3" />
            <p className="text-[12.5px] leading-4 text-muted">
              {stats.visits > 0 ? "Not known for these visits yet." : "Countries show after your first visits."}
            </p>
          </>
        )}
      </PlainStatCard>
    </div>
  );
}

/** Visits this period against the period before, as a line chart. `empty` shows over it until the first visit. */
export function VisitsCard({
  stats,
  period,
  empty,
  loading = false,
}: {
  stats: VisitStats | null;
  period: Period;
  empty?: ReactNode;
  loading?: boolean;
}) {
  if (!stats) {
    return (
      <Card className="gap-4 px-4 pt-[18px] pb-4 sm:px-5" aria-busy="true" aria-label="Loading the visits chart">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[220px] w-full" />
      </Card>
    );
  }
  const noVisits = stats.visits === 0 && stats.previousVisits === 0;
  return (
    <Card className={cn("gap-4 px-4 pt-[18px] pb-4 transition-opacity duration-300 sm:px-5", loading && "opacity-60")} aria-busy={loading || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13.5px] font-medium text-slate">Visits</span>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-[28px] leading-8 font-semibold tracking-[-0.02em]">{stats.visits}</span>
            <Trend current={stats.visits} previous={stats.previousVisits} />
            <span className="text-[13px] text-muted">{periodRange(period)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-1 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-2.5 rounded-sm bg-brand" />
            {period === "today" ? "Today" : "This period"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 border-t-2 border-dashed border-soft" />
            {period === "today" ? "Yesterday" : "Before"}
          </span>
        </div>
      </div>
      <VisitsChart data={stats.chart} empty={noVisits ? empty : undefined} />
    </Card>
  );
}

/** On Starter, where the overview's numbers would be: what Growth adds, and how to get it. */
export function AnalyticsUpsell({ className }: { className?: string }) {
  const { lodge } = useLodge();
  const growth = PLANS.GROWTH;
  return (
    <Card className={cn("relative flex-row flex-wrap items-center gap-4 overflow-hidden px-5 py-5 sm:px-6", className)}>
      <span aria-hidden="true" className="absolute -top-16 -right-16 size-48 rounded-full bg-purple-wash" />
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-purple-tint text-purple">
        <BarChart3 className="size-5" />
      </span>
      <div className="relative flex min-w-0 flex-1 basis-60 flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-purple uppercase">
          <Lock className="size-3" />
          {growth.name} plan
        </span>
        <p className="font-display text-lg leading-6 font-semibold">Take bookings on your site, and see who visits</p>
        <p className="text-[13.5px] text-muted">A bookings calendar guests book from, plus visits by day, countries and booking chats per room.</p>
      </div>
      <a
        href={stayzimChatUrl(`Hi StayZim, I'd like to move ${lodge.name} to the ${growth.name} plan ($${growth.price}/month).`)}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "accent", size: "lg", className: "relative w-full sm:w-auto" })}
      >
        Upgrade to {growth.name} (${growth.price}/mo)
      </a>
    </Card>
  );
}
