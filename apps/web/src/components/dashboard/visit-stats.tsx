"use client";

import { Card } from "@stayzim/ui/components/card";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { CalendarDays, Eye, Globe2, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import { LeadStatCard, PlainStatCard, Trend, TrayStatCard } from "@/components/dashboard/stat-card";
import { VisitsChart } from "@/components/dashboard/visits-chart";
import { PERIODS, periodRange, previousLabel, type Period, type VisitStats } from "@/lib/stats";

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

/** Visits today, this period, booking chats, and where visitors are. */
export function StatCards({ stats, period }: { stats: VisitStats; period: Period }) {
  const top = stats.countries[0];
  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
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
        label={period === "today" ? "Today" : period === "7d" ? "Last 7 days" : "Last 30 days"}
        value={stats.visits}
        badge={<Trend current={stats.visits} previous={stats.previousVisits} />}
        foot={`${stats.previousVisits} ${previousLabel(period)}`}
      />
      <TrayStatCard
        tone="purple"
        icon={MessageCircle}
        label="Booking chats"
        value={stats.bookingChats}
        badge={<Trend current={stats.bookingChats} previous={stats.previousBookingChats} />}
        foot="Book on WhatsApp taps"
      />
      <PlainStatCard icon={Globe2} label="Where visitors are">
        {top ? (
          <>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              {stats.countries.slice(0, 3).map((country, index) => (
                <span
                  key={country.code}
                  className={cn(index === 0 ? "bg-rust" : index === 1 ? "bg-clay" : "bg-peach")}
                  style={{ width: `${country.share}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[12.5px] text-slate">
              {stats.countries.slice(0, 3).map((country) => (
                <span key={country.code}>
                  {country.code} <strong className="font-semibold">{country.share}%</strong>
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="h-2 rounded-full bg-line-3" />
            <p className="text-[12.5px] leading-4 text-muted">Countries show after your first visits.</p>
          </>
        )}
      </PlainStatCard>
    </div>
  );
}

/** Visits this period against the period before, as a line chart. */
export function VisitsCard({ stats, period, empty }: { stats: VisitStats; period: Period; empty?: ReactNode }) {
  return (
    <Card className="gap-4 px-4 pt-[18px] pb-4 sm:px-5">
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
      <VisitsChart data={stats.chart} empty={stats.tracking ? undefined : empty} />
    </Card>
  );
}
