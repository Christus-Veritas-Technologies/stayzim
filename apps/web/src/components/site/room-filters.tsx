"use client";

import { BOOKING_LIMITS, dateAdd, nightsBetween, todayInHarare, type AmenityKey, type SiteAvailability } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AMENITIES } from "@/lib/lodge";
import { env } from "@/lib/public-env";

export type FilterRoom = { id: string; price: number; sleeps: number; size: number | null; amenities: AmenityKey[] };

type Sort = "order" | "price-up" | "price-down" | "space";

const SORTS: { value: Sort; label: string }[] = [
  { value: "order", label: "Recommended" },
  { value: "price-up", label: "Price: low to high" },
  { value: "price-down", label: "Price: high to low" },
  { value: "space", label: "Most space" },
];

/** Price steps a guest can cap at: round numbers between the cheapest and dearest room. */
function priceSteps(prices: number[]) {
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (high === low) return [];
  const step = high - low > 150 ? 50 : high - low > 60 ? 20 : 10;
  const steps: number[] = [];
  for (let value = Math.ceil(low / step) * step; value < high; value += step) steps.push(value);
  return steps.slice(0, 5);
}

/** The nights already full in each room, for the dates a guest picked (Pro sites that take bookings). */
function useFullRooms(slug: string | undefined, checkIn: string, checkOut: string) {
  const [full, setFull] = useState<Set<string> | null>(null);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  useEffect(() => {
    if (!slug || nights < 1 || nights > BOOKING_LIMITS.maxNights) {
      setFull(null);
      return;
    }
    let current = true;
    void fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/sites/${encodeURIComponent(slug)}/availability?from=${checkIn}&days=${Math.min(nights, BOOKING_LIMITS.availabilityDays)}`)
      .then((response) => (response.ok ? (response.json() as Promise<SiteAvailability>) : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        if (!current) return;
        const stay = Array.from({ length: nights }, (_, index) => dateAdd(checkIn, index));
        setFull(new Set(data.rooms.filter((room) => room.full.some((night) => stay.includes(night))).map((room) => room.id)));
      })
      // Can't check right now: show every room rather than none
      .catch(() => current && setFull(null));
    return () => {
      current = false;
    };
  }, [slug, checkIn, nights]);
  return full;
}

/**
 * Guests, a top price, a sort and (on the Rooms page) amenities, above a list
 * of rooms the server already drew: each item carries data-room-id, and the
 * filter hides and reorders them in place. Without JavaScript every room
 * shows, in the owner's order. Shown at 2 rooms or more.
 */
export function RoomFilters({
  rooms,
  amenities = false,
  control,
  datesFor,
  className,
  children,
}: {
  rooms: FilterRoom[];
  /** Amenity toggles too (the Rooms page) */
  amenities?: boolean;
  /** The design's look for the selects and chips */
  control?: string;
  /** Pro sites that take bookings: "Check dates" hides rooms already full (the site's slug) */
  datesFor?: string;
  className?: string;
  children: ReactNode;
}) {
  const [guests, setGuests] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sort, setSort] = useState<Sort>("order");
  const [wanted, setWanted] = useState<AmenityKey[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const full = useFullRooms(datesFor, checkIn, checkOut);
  const list = useRef<HTMLDivElement>(null);
  const today = todayInHarare();

  const most = Math.max(...rooms.map((room) => room.sleeps));
  const steps = useMemo(() => priceSteps(rooms.map((room) => room.price)), [rooms]);
  const shared = useMemo(() => {
    const counts = new Map<AmenityKey, number>();
    for (const room of rooms) for (const key of room.amenities) counts.set(key, (counts.get(key) ?? 0) + 1);
    // Only amenities that tell rooms apart, most common first
    return [...counts].filter(([, count]) => count < rooms.length || rooms.length === 1).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key]) => key);
  }, [rooms]);

  const shown = useMemo(() => {
    const matches = rooms.filter(
      (room) =>
        room.sleeps >= guests && (!maxPrice || room.price <= maxPrice) && wanted.every((key) => room.amenities.includes(key)) && !full?.has(room.id),
    );
    const sorted = [...matches];
    if (sort === "price-up") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-down") sorted.sort((a, b) => b.price - a.price);
    if (sort === "space") sorted.sort((a, b) => (b.size ?? 0) - (a.size ?? 0) || b.sleeps - a.sleeps);
    return sorted.map((room) => room.id);
  }, [rooms, guests, maxPrice, wanted, sort, full]);

  useEffect(() => {
    const items = list.current?.querySelectorAll<HTMLElement>("[data-room-id]") ?? [];
    for (const item of items) {
      const position = shown.indexOf(item.dataset.roomId ?? "");
      item.hidden = position === -1;
      item.style.order = position === -1 ? "" : String(position);
    }
  }, [shown]);

  if (rooms.length < 2) return <>{children}</>;
  const filtered = shown.length < rooms.length;
  const select = cn("h-11 min-w-0 cursor-pointer appearance-none border border-current/15 bg-transparent bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 pl-4 text-[14.5px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-[var(--theme)]/30", "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]", control ?? "rounded-full");
  const reset = () => {
    setGuests(0);
    setMaxPrice(0);
    setSort("order");
    setWanted([]);
    setCheckIn("");
    setCheckOut("");
  };
  const dateInput = cn("h-11 min-w-0 border border-current/15 bg-transparent px-3 text-[14.5px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-[var(--theme)]/30", control ?? "rounded-full");

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-3" role="group" aria-label="Find a room">
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 opacity-60" aria-hidden="true" />
          <select aria-label="Guests" value={guests} onChange={(event) => setGuests(Number(event.target.value))} className={select}>
            <option value={0}>Any guests</option>
            {Array.from({ length: most }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count === 1 ? "1 guest" : `${count} guests`}
              </option>
            ))}
          </select>
          {steps.length > 0 ? (
            <select aria-label="Price a night" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className={select}>
              <option value={0}>Any price</option>
              {steps.map((value) => (
                <option key={value} value={value}>
                  Up to ${value}
                </option>
              ))}
            </select>
          ) : null}
          <select aria-label="Sort rooms" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={select}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {datesFor ? (
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="size-4 shrink-0 opacity-60" aria-hidden="true" />
            <label className="flex items-center gap-2 text-[14px]">
              <span className="opacity-75">Arrive</span>
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(event) => {
                  setCheckIn(event.target.value);
                  if (checkOut && event.target.value >= checkOut) setCheckOut(dateAdd(event.target.value, 1));
                }}
                className={dateInput}
              />
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="opacity-75">Leave</span>
              <input type="date" value={checkOut} min={checkIn ? dateAdd(checkIn, 1) : dateAdd(today, 1)} onChange={(event) => setCheckOut(event.target.value)} className={dateInput} />
            </label>
          </div>
        ) : null}
        {amenities && shared.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shared.map((key) => {
              const on = wanted.includes(key);
              const Icon = AMENITIES[key]?.icon;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWanted((current) => (on ? current.filter((entry) => entry !== key) : [...current, key]))}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 border px-3.5 text-[13.5px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[var(--theme)]/30",
                    control ?? "rounded-full",
                    on ? "border-[var(--theme)] bg-[var(--theme)] text-white" : "border-current/15 hover:border-current/30",
                  )}
                >
                  {Icon ? <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" /> : null}
                  {AMENITIES[key]?.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {filtered ? (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="status" className="text-[14px] opacity-75">
              {shown.length === 0 ? (full ? "Every room is full on those dates." : "No rooms match.") : `Showing ${shown.length} of ${rooms.length} rooms${full ? " free on your dates" : ""}.`}{" "}
              <button type="button" onClick={reset} className="font-semibold text-[var(--theme)] underline-offset-2 hover:underline">
                Show all rooms
              </button>
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
      <div ref={list}>{children}</div>
    </div>
  );
}
