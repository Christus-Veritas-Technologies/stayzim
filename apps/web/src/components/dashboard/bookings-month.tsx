"use client";

import { Button } from "@stayzim/ui/components/button";
import { RangeCalendar } from "@stayzim/ui/components/range-calendar";
import { dateAdd, formatDay, occupancy } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { LockKeyhole, Plus } from "lucide-react";

import { BookingRow } from "@/components/dashboard/booking-row";
import { holdsOf, type BookingsWindow, type DashboardBooking } from "@/lib/bookings";

/**
 * Phone calendar: one room's month, with a dot on each day that's partly
 * (blue) or fully (red) booked, and the chosen day's comings and goings below.
 */
export function BookingsMonth({
  window,
  month,
  onMonthChange,
  roomId,
  onRoomChange,
  day,
  onDayChange,
  onOpen,
  onAdd,
}: {
  window: BookingsWindow;
  month: string;
  onMonthChange: (month: string) => void;
  roomId: string;
  onRoomChange: (roomId: string) => void;
  day: string;
  onDayChange: (day: string) => void;
  onOpen: (booking: DashboardBooking) => void;
  onAdd: (roomId: string, date: string, block?: boolean) => void;
}) {
  const room = window.rooms.find((entry) => entry.id === roomId) ?? window.rooms[0];
  if (!room) return null;
  const taken = occupancy(holdsOf(window.bookings, room.id), window.from, window.to);
  const requested = new Set(
    window.bookings
      .filter((booking) => booking.roomId === room.id && booking.status === "REQUESTED" && !booking.expired)
      .flatMap((booking) => {
        const nights: string[] = [];
        for (let night = booking.checkIn; night < booking.checkOut; night = dateAdd(night, 1)) nights.push(night);
        return nights;
      }),
  );
  const marks: Record<string, React.ReactNode> = {};
  for (const [night, count] of taken) {
    if (count > 0) marks[night] = <span className={cn("size-1.5 rounded-full", count >= room.units ? "bg-danger" : "bg-brand")} />;
    else if (requested.has(night)) marks[night] = <span className="size-1.5 rounded-full border border-purple" />;
  }
  for (const night of requested) if (!marks[night]) marks[night] = <span className="size-1.5 rounded-full border border-purple" />;

  const onDay = window.bookings.filter(
    (booking) =>
      booking.roomId === room.id &&
      (booking.status === "CONFIRMED" || (booking.status === "REQUESTED" && !booking.expired)) &&
      booking.checkIn <= day &&
      booking.checkOut >= day,
  );
  const count = taken.get(day) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {window.rooms
          .filter((entry) => entry.visible || entry.id === room.id)
          .map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onRoomChange(entry.id)}
              aria-pressed={entry.id === room.id}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                entry.id === room.id ? "border-primary bg-primary text-primary-foreground" : "border-line bg-white text-muted hover:text-ink",
              )}
            >
              {entry.name}
            </button>
          ))}
      </div>

      <div className="rounded-2xl border border-line bg-white p-3">
        <RangeCalendar
          mode="day"
          selected={day}
          onSelect={onDayChange}
          month={month}
          onMonthChange={onMonthChange}
          marks={marks}
          label={`${room.name} bookings`}
          describe={(date) => {
            const value = taken.get(date) ?? 0;
            return value >= room.units ? "full" : value > 0 ? `${value} of ${room.units} booked` : requested.has(date) ? "a request waiting" : undefined;
          }}
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-line-3 pt-2.5 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand" />
            Some booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-danger" />
            Full
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full border border-purple" />
            Request
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold">{formatDay(day)}</span>
          <span className="text-[12.5px] text-muted">
            {count >= room.units ? "Full" : `${room.units - count} of ${room.units} free`}
          </span>
        </div>
        {onDay.length === 0 ? (
          <p className="rounded-xl bg-surface px-4 py-4 text-[13px] text-muted">Nothing booked for {room.name} on this day.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-3 overflow-hidden rounded-xl border border-line bg-white">
            {onDay.map((booking) => (
              <li key={booking.id}>
                <BookingRow booking={booking} onOpen={onOpen} day={day} />
              </li>
            ))}
          </ul>
        )}
        {window.enabled ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={() => onAdd(room.id, day, true)}>
              <LockKeyhole />
              Close dates
            </Button>
            <Button onClick={() => onAdd(room.id, day)} disabled={count >= room.units}>
              <Plus />
              Add booking
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
