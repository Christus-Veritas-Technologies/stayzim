"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { cn } from "@stayzim/ui/lib/utils";
import { BedDouble, CalendarDays, Clock3, Info, TriangleAlert, Users } from "lucide-react";

import { stayLine, type DashboardBooking } from "@/lib/bookings";
import { formatWhen } from "@/lib/format";

/** "Sarah Banda" → "SB" */
function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]![0] ?? "") + (parts.length > 1 ? (parts.at(-1)![0] ?? "") : "")).toUpperCase();
}

/**
 * One request from the site, queue-style: who, the stay at a glance, their
 * note, and Confirm in the footer. A request that no longer fits is outlined
 * and says why, with Change or decline instead of Confirm.
 */
export function RequestCard({
  booking,
  position,
  warning,
  busy,
  onOpen,
  onConfirm,
}: {
  booking: DashboardBooking;
  position: number;
  /** null when the nights are free; undefined while the calendar loads */
  warning: { kind: "full" | "last"; text: string } | null | undefined;
  busy: boolean;
  onOpen: () => void;
  onConfirm: () => void;
}) {
  const full = warning?.kind === "full";
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-xs",
        full ? "border-warning-line ring-1 ring-warning-line/70" : "border-line",
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-3.5">
          <span className="hidden w-6 shrink-0 pt-2.5 font-mono text-[12px] font-semibold text-muted-2 sm:block">#{position}</span>
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-wash text-[13px] font-semibold text-purple sm:size-11"
            aria-hidden="true"
          >
            {initials(booking.guestName)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-[16px] leading-6 font-semibold">{booking.guestName ?? "Guest"}</span>
              <Badge status variant="purple">
                Request
              </Badge>
              {full ? (
                <Badge status variant="warning">
                  Clash
                </Badge>
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-x-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Clock3 className="size-3.5" />
                Sent {formatWhen(booking.createdAt).toLowerCase()}
              </span>
              <span className="text-soft">·</span>
              <span className="font-mono text-[11.5px] tracking-[0.02em] whitespace-nowrap">{booking.reference}</span>
            </span>
          </div>
          <span className="shrink-0 text-right">
            <span className="block font-display text-[19px] leading-6 font-semibold tabular-nums sm:text-[22px] sm:leading-7">${booking.total}</span>
            <span className="text-[11.5px] text-muted tabular-nums">
              {booking.nights} × ${booking.nightlyPrice}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:pl-24">
          <ul className="flex flex-wrap gap-1.5 text-[12.5px] text-ink-2">
            <li className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line-3 bg-surface px-2.5">
              <BedDouble className="size-3.5 text-muted-2" />
              {booking.roomName}
              {booking.quantity > 1 ? ` ×${booking.quantity}` : ""}
            </li>
            <li className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line-3 bg-surface px-2.5">
              <CalendarDays className="size-3.5 text-muted-2" />
              {stayLine(booking)}
            </li>
            {booking.guests ? (
              <li className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line-3 bg-surface px-2.5">
                <Users className="size-3.5 text-muted-2" />
                {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
              </li>
            ) : null}
          </ul>

          {booking.message ? (
            <p className="rounded-xl bg-surface px-3.5 py-2.5 text-[13.5px] leading-5 text-ink-2">
              <span className="mr-2 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-2 uppercase">Note</span>
              {booking.message}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
          full ? "border-warning-line/70 bg-warning-tint/60" : "border-line-3 bg-surface/60",
        )}
      >
        {warning ? (
          <p className={cn("flex items-start gap-2 text-[13px] leading-5", full ? "font-semibold text-warning" : "text-muted")}>
            {full ? <TriangleAlert className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-2" />}
            {warning.text}
          </p>
        ) : warning === undefined ? (
          <span />
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Info className="size-4 shrink-0 text-muted-2" />
            The nights are free.
          </p>
        )}
        <div className="flex shrink-0 justify-end gap-2 *:flex-1 sm:*:flex-none">
          <Button variant="outline" onClick={onOpen}>
            {full ? "Change or decline" : "Review"}
          </Button>
          {full ? null : (
            <Button onClick={onConfirm} loading={busy}>
              Confirm
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
