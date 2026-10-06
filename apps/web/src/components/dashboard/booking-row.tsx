"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { cn } from "@stayzim/ui/lib/utils";
import { ChevronRight, LockKeyhole, LogIn, LogOut } from "lucide-react";

import { bookingStatus, stayLine, type DashboardBooking } from "@/lib/bookings";

const TONE_TEXT = { success: "text-success", purple: "text-purple", danger: "text-danger", neutral: "text-muted-2" } as const;

/** One booking in a list: who, which room, when, and its status. With `day`, says whether they arrive or leave that day. */
export function BookingRow({ booking, onOpen, day, showRoom = true }: { booking: DashboardBooking; onOpen: (booking: DashboardBooking) => void; day?: string; showRoom?: boolean }) {
  const status = bookingStatus(booking);
  const block = booking.kind === "BLOCK";
  const arriving = day && booking.checkIn === day;
  const leaving = day && booking.checkOut === day;
  return (
    <button
      type="button"
      onClick={() => onOpen(booking)}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors outline-none hover:bg-surface focus-visible:bg-surface sm:px-4"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
          block ? "bg-surface text-muted" : booking.status === "REQUESTED" ? "bg-purple-wash text-purple" : "bg-brand-tint text-brand",
        )}
        aria-hidden="true"
      >
        {block ? <LockKeyhole className="size-4" /> : (booking.guestName ?? "?").slice(0, 1).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold">{block ? `Closed${booking.notes ? `: ${booking.notes}` : ""}` : (booking.guestName ?? "Guest")}</span>
          {arriving ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-success">
              <LogIn className="size-3" />
              Arrives
            </span>
          ) : leaving ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-muted">
              <LogOut className="size-3" />
              Leaves
            </span>
          ) : null}
        </span>
        <span className="truncate text-[12.5px] text-muted">
          <span className={cn("font-semibold sm:hidden", TONE_TEXT[status.tone])}>{status.label} · </span>
          {showRoom ? `${booking.roomName}${booking.quantity > 1 ? ` ×${booking.quantity}` : ""} · ` : ""}
          {stayLine(booking)}
          {!block && booking.guests ? ` · ${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {!block && booking.total > 0 ? <span className="hidden text-[13px] font-semibold tabular-nums sm:inline">${booking.total}</span> : null}
        <Badge status variant={status.tone} className="hidden sm:inline-flex">
          {status.label}
        </Badge>
        <ChevronRight className="size-4 text-soft" />
      </span>
    </button>
  );
}
