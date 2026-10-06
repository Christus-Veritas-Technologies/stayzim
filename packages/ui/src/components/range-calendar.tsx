"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

/*
 * A month of days for picking a stay (check-in, then check-out) or one day.
 * Dates are "YYYY-MM-DD" strings, never Date objects, so nothing shifts with
 * the viewer's time zone. No date library: weeks start on Monday.
 *
 * Nights in `unavailable` can't be stayed: a range can't cross them, but a
 * stay can end (check out) on one.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function toTime(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}
function fromTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}
function addDays(date: string, days: number) {
  return fromTime(toTime(date) + days * DAY_MS);
}
/** "2026-10" + 1 → "2026-11" */
export function addMonths(month: string, by: number) {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const next = new Date(Date.UTC(year, index - 1 + by, 1));
  return next.toISOString().slice(0, 7);
}
export function monthOf(date: string) {
  return date.slice(0, 7);
}
function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number) as [number, number];
  return `${MONTHS[index - 1]} ${year}`;
}
function dayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return `${weekday} ${day} ${MONTHS[month - 1]}`;
}

/** The days shown for a month: whole weeks from Monday, with the edges of the months around it. */
function monthGrid(month: string) {
  const first = `${month}-01`;
  const weekday = (new Date(toTime(first)).getUTCDay() + 6) % 7;
  const start = addDays(first, -weekday);
  const days: string[] = [];
  for (let index = 0; index < 42; index++) days.push(addDays(start, index));
  // Drop a last week that's all next month
  return days.slice(0, days[35]!.startsWith(month) ? 42 : 35);
}

export type DateRange = { start: string | null; end: string | null };

type Props = {
  month: string;
  onMonthChange: (month: string) => void;
  /** Days before this can't be picked */
  min?: string;
  /** Days after this can't be picked */
  max?: string;
  /** Nights that can't be stayed */
  unavailable?: ReadonlySet<string>;
  /** A small mark under a day's number (e.g. how booked it is) */
  marks?: Partial<Record<string, React.ReactNode>>;
  className?: string;
  /** Label for screen readers, e.g. "Dates" */
  label?: string;
  /** How a day reads to screen readers, e.g. "13 October, full" */
  describe?: (date: string) => string | undefined;
} & (
  | { mode: "range"; value: DateRange; onChange: (value: DateRange) => void; selected?: never; onSelect?: never }
  | { mode: "day"; selected: string | null; onSelect: (date: string) => void; value?: never; onChange?: never }
);

export function RangeCalendar(props: Props) {
  const { month, onMonthChange, min, max, unavailable, marks, className, label = "Dates", describe } = props;
  const days = monthGrid(month);
  const [focused, setFocused] = React.useState<string | null>(null);
  const grid = React.useRef<HTMLDivElement>(null);

  const outOfRange = (date: string) => (min !== undefined && date < min) || (max !== undefined && date > max);
  const blocked = (date: string) => unavailable?.has(date) ?? false;

  /** Every night from start up to, not including, end is free. */
  const clear = (start: string, end: string) => {
    for (let night = start; night < end; night = addDays(night, 1)) if (blocked(night)) return false;
    return true;
  };

  function pick(date: string) {
    if (outOfRange(date)) return;
    if (props.mode === "day") {
      props.onSelect(date);
      return;
    }
    const { start, end } = props.value;
    // Second tap: the check-out day, if the nights between are free
    if (start && !end && date > start && clear(start, date)) {
      props.onChange({ start, end: date });
      return;
    }
    if (blocked(date)) return;
    props.onChange({ start: date, end: null });
  }

  function moveFocus(from: string, by: number) {
    const next = addDays(from, by);
    if (monthOf(next) !== month) onMonthChange(monthOf(next));
    setFocused(next);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent, date: string) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(date, moves[event.key]!);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      // The same day of the month before or after (or its last day)
      const target = addMonths(monthOf(date), event.key === "PageUp" ? -1 : 1);
      const [year, index] = target.split("-").map(Number) as [number, number];
      const lastDay = new Date(Date.UTC(year, index, 0)).getUTCDate();
      const next = `${target}-${String(Math.min(Number(date.slice(8)), lastDay)).padStart(2, "0")}`;
      moveFocus(date, Math.round((toTime(next) - toTime(date)) / DAY_MS));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(date);
    }
  }

  const start = props.mode === "range" ? props.value.start : props.selected;
  const end = props.mode === "range" ? props.value.end : null;
  const tabbable = focused && days.includes(focused) ? focused : start && days.includes(start) ? start : days.find((day) => day.startsWith(month))!;
  const earliest = min ? monthOf(min) : null;
  const latest = max ? monthOf(max) : null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={earliest !== null && month <= earliest}
          aria-label="Previous month"
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors outline-none hover:bg-surface hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-30"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-[14px] font-semibold text-ink" aria-live="polite">
          {monthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          disabled={latest !== null && month >= latest}
          aria-label="Next month"
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors outline-none hover:bg-surface hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-30"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div ref={grid} role="grid" aria-label={`${label}, ${monthLabel(month)}`} className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} role="columnheader" className="pb-1 text-center text-[11px] font-semibold text-muted-2">
            {weekday}
          </span>
        ))}
        {days.map((date) => {
          const inMonth = date.startsWith(month);
          const disabled = outOfRange(date);
          const full = blocked(date);
          const isStart = date === start;
          const isEnd = date === end;
          const between = Boolean(start && end && date > start && date < end);
          const note = describe?.(date);
          return (
            <span
              key={date}
              role="gridcell"
              className={cn(
                "relative flex justify-center",
                between && "bg-brand-wash",
                isStart && end && "rounded-l-full bg-[linear-gradient(90deg,transparent_50%,var(--color-brand-wash)_50%)]",
                isEnd && "rounded-r-full bg-[linear-gradient(90deg,var(--color-brand-wash)_50%,transparent_50%)]",
              )}
            >
              <button
                type="button"
                data-date={date}
                tabIndex={date === tabbable ? 0 : -1}
                disabled={disabled}
                onClick={() => pick(date)}
                onKeyDown={(event) => onKeyDown(event, date)}
                onFocus={() => setFocused(date)}
                aria-pressed={isStart || isEnd || undefined}
                aria-label={[dayLabel(date), isStart ? (props.mode === "range" ? "check-in" : "selected") : null, isEnd ? "check-out" : null, note ?? (full ? "full" : null)]
                  .filter(Boolean)
                  .join(", ")}
                className={cn(
                  "relative flex size-10 flex-col items-center justify-center rounded-full text-[13.5px] font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:size-9",
                  inMonth ? "text-ink" : "text-soft",
                  !disabled && !isStart && !isEnd && "hover:bg-surface",
                  disabled && "cursor-not-allowed text-soft/60",
                  full && !isStart && !isEnd && "text-soft line-through decoration-soft",
                  (isStart || isEnd) && "bg-primary text-primary-foreground shadow-brand",
                )}
              >
                {Number(date.slice(8))}
                {marks?.[date] ? <span className="absolute bottom-1 flex">{marks[date]}</span> : null}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
