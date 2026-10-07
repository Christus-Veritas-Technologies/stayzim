"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { BedDouble, Inbox, LogIn, LogOut, type LucideIcon } from "lucide-react";

import type { Lodge } from "@/lib/lodge";

const TONES = {
  purple: { band: "bg-purple-tint text-purple-dark", icon: "text-purple", ring: "hover:border-purple-line" },
  success: { band: "bg-success-tint text-success", icon: "text-success", ring: "hover:border-success-line" },
  warning: { band: "bg-warning-tint text-warning", icon: "text-warning", ring: "hover:border-warning-line" },
  brand: { band: "bg-brand-wash text-brand-dark", icon: "text-brand", ring: "hover:border-[#cbe9f5]" },
} as const;

type Tile = { label: string; value: number; note: string; tone: keyof typeof TONES; icon: LucideIcon; onClick: () => void };

/**
 * Four tiles over the bookings: requests waiting, and today's arrivals,
 * departures and guests staying. Each opens the tab that shows them.
 */
export function BookingsOverview({ lodge, onRequests, onCalendar }: { lodge: Lodge; onRequests: () => void; onCalendar: () => void }) {
  const { arriving, leaving, staying } = lodge.today;
  const waiting = lodge.bookingsWaiting;
  const tiles: Tile[] = [
    {
      label: "Waiting for you",
      value: waiting,
      note: waiting === 0 ? "All caught up" : waiting === 1 ? "Request to confirm" : "Requests to confirm",
      tone: "purple",
      icon: Inbox,
      onClick: onRequests,
    },
    { label: "Arriving today", value: arriving, note: arriving === 1 ? "Guest checks in" : "Guests check in", tone: "success", icon: LogIn, onClick: onCalendar },
    { label: "Leaving today", value: leaving, note: leaving === 1 ? "Room to turn around" : "Rooms to turn around", tone: "warning", icon: LogOut, onClick: onCalendar },
    { label: "Staying tonight", value: staying, note: staying === 1 ? "Room taken" : "Rooms taken", tone: "brand", icon: BedDouble, onClick: onCalendar },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3" aria-label="Today">
      {tiles.map((tile) => {
        const tone = TONES[tile.tone];
        const Icon = tile.icon;
        return (
          <li key={tile.label}>
            <button
              type="button"
              onClick={tile.onClick}
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-left shadow-xs transition-[border-color,transform] outline-none hover:-translate-y-px focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transform-none",
                tone.ring,
              )}
            >
              <span className={cn("flex items-center justify-between gap-2 px-3 py-2 sm:px-3.5", tone.band)}>
                <span className="truncate font-mono text-[10.5px] font-semibold tracking-[0.06em] uppercase sm:text-[11px]">{tile.label}</span>
                <Icon className={cn("size-4 shrink-0", tone.icon)} />
              </span>
              <span className="flex flex-col gap-0.5 px-3 pt-2.5 pb-3 sm:px-3.5">
                <span className={cn("font-display text-[28px] leading-8 font-semibold tabular-nums", tile.value === 0 ? "text-muted-2" : "text-ink")}>{tile.value}</span>
                <span className="truncate text-[12px] text-muted">{tile.note}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
