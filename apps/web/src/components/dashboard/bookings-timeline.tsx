"use client";

import { dateAdd, formatDay, nightsBetween, occupancy } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@stayzim/ui/components/tooltip";

import { holdsOf, type BookingsWindow, type DashboardBooking } from "@/lib/bookings";

const WEEKDAY = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function weekday(date: string) {
  return WEEKDAY[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7]!;
}

/** Bookings in rows that don't overlap, so bars never sit on top of each other. */
function lanes(bookings: DashboardBooking[]) {
  const ends: string[] = [];
  return bookings.map((booking) => {
    let lane = ends.findIndex((end) => end <= booking.checkIn);
    if (lane === -1) lane = ends.length;
    ends[lane] = booking.checkOut;
    return { booking, lane };
  });
}

/**
 * Desktop calendar: rooms down the side, days across. Each day shows how many
 * of the room are taken; stays and closed dates are bars; requests are dashed.
 * Tap an empty day to add a booking there, a bar to open it.
 */
export function BookingsTimeline({
  window,
  from,
  days,
  today,
  onOpen,
  onAdd,
}: {
  window: BookingsWindow;
  from: string;
  days: number;
  today: string;
  onOpen: (booking: DashboardBooking) => void;
  onAdd: (roomId: string, date: string) => void;
}) {
  const dates = Array.from({ length: days }, (_, index) => dateAdd(from, index));
  const to = dateAdd(from, days);
  const columns = { gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` };

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="grid grid-cols-[180px_minmax(0,1fr)] border-b border-line bg-surface">
        <span className="px-4 py-2 text-xs font-semibold text-muted">Room</span>
        <div className="grid" style={columns}>
          {dates.map((date) => (
            <span
              key={date}
              className={cn(
                "flex flex-col items-center border-l border-line-3 py-1.5 text-[11px] leading-4",
                date === today ? "font-semibold text-brand" : "text-muted-2",
              )}
            >
              <span>{weekday(date)}</span>
              <span className={cn("text-[12.5px] tabular-nums", date === today ? "text-brand" : "text-ink")}>{Number(date.slice(8))}</span>
            </span>
          ))}
        </div>
      </div>

      {window.rooms
        .filter((room) => room.visible || window.bookings.some((booking) => booking.roomId === room.id))
        .map((room) => {
          const shown = window.bookings.filter(
            (booking) => booking.roomId === room.id && (booking.status === "CONFIRMED" || (booking.status === "REQUESTED" && !booking.expired)),
          );
          const taken = occupancy(holdsOf(window.bookings, room.id), from, to);
          const placed = lanes(shown);
          const laneCount = Math.max(1, ...placed.map((entry) => entry.lane + 1));
          return (
            <div key={room.id} className="grid grid-cols-[180px_minmax(0,1fr)] border-b border-line-3 last:border-0">
              <span className="flex min-w-0 flex-col justify-center px-4 py-2">
                <span className="truncate text-[13.5px] font-semibold">{room.name}</span>
                <span className="text-xs text-muted-2">
                  {room.units > 1 ? `You have ${room.units}` : "1 room"}
                  {room.visible ? "" : " · Hidden"}
                </span>
              </span>
              <div className="relative grid" style={{ ...columns, gridTemplateRows: `repeat(${laneCount}, 30px) 18px` }}>
                {dates.map((date, index) => {
                  const count = taken.get(date) ?? 0;
                  const full = count >= room.units;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => onAdd(room.id, date)}
                      disabled={!window.enabled}
                      aria-label={`${room.name}, ${formatDay(date)}: ${full ? "full" : `${room.units - count} free`}. Add a booking`}
                      style={{ gridColumn: index + 1, gridRow: "1 / -1" }}
                      className={cn(
                        "flex items-end justify-center border-l border-line-3 pb-0.5 text-[10.5px] tabular-nums transition-colors outline-none hover:bg-brand-wash focus-visible:bg-brand-wash disabled:hover:bg-transparent",
                        date === today && "bg-brand-wash/50",
                        full ? "font-semibold text-danger" : "text-muted-2",
                      )}
                    >
                      {room.units > 1 ? `${count}/${room.units}` : full ? "Full" : ""}
                    </button>
                  );
                })}
                {placed.map(({ booking, lane }) => {
                  const start = Math.max(0, nightsBetween(from, booking.checkIn));
                  const end = Math.min(days, nightsBetween(from, booking.checkOut));
                  if (end <= 0 || start >= days) return null;
                  const block = booking.kind === "BLOCK";
                  const request = booking.status === "REQUESTED";
                  const label = block ? `Closed${booking.notes ? `: ${booking.notes}` : ""}` : (booking.guestName ?? "Guest");
                  return (
                    <Tooltip key={booking.id}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => onOpen(booking)}
                            style={{ gridColumn: `${start + 1} / ${end + 1}`, gridRow: lane + 1 }}
                            className={cn(
                              "relative z-10 mx-0.5 my-[3px] flex min-w-0 items-center gap-1 truncate rounded-lg px-2 text-left text-[12px] font-semibold shadow-xs transition-transform outline-none hover:-translate-y-px focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transform-none",
                              block && "bg-[repeating-linear-gradient(135deg,#E4E9EC_0,#E4E9EC_6px,#F4F7F9_6px,#F4F7F9_12px)] text-muted",
                              request && "border border-dashed border-purple bg-purple-tint text-purple-ink",
                              !block && !request && "bg-primary text-primary-foreground",
                              booking.checkIn < from && "rounded-l-none",
                              booking.checkOut > to && "rounded-r-none",
                            )}
                          />
                        }
                      >
                        <span className="truncate">
                          {label}
                          {booking.quantity > 1 ? ` ×${booking.quantity}` : ""}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {label} · {booking.roomName} · {formatDay(booking.checkIn)} to {formatDay(booking.checkOut)}
                        {request ? " · Waiting for you" : ""}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
