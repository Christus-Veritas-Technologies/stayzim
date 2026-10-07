"use client";

import { dateAdd, todayInHarare } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { useBooking } from "@/components/site/tracking";

/** "Mon 12 Oct" */
function shortDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export type EnquiryLook = {
  /** The bar itself */
  className?: string;
  /** Each field's box */
  field?: string;
  /** The small label above (or inside) each field */
  label?: string;
  /** The send button */
  button?: string;
  /** The line under the bar; null hides it */
  hint?: string | null;
  /** "stacked": label above the box (cards). "inline": label inside the box (pills). */
  layout?: "stacked" | "inline";
};

/**
 * Room, arrival, departure and guests in one bar under the hero (Growth and
 * Pro designs). Where the site takes bookings it opens the booking sheet with
 * all of it filled in; otherwise it opens WhatsApp with a message ready.
 * Native date and select inputs underneath, so it stays light on a phone.
 */
export function EnquiryBar({
  lodge,
  rooms,
  whatsapp,
  look = {},
  roomWord = "Room",
}: {
  lodge: string;
  rooms: { id: string; name: string; sleeps: number }[];
  whatsapp: string | null;
  look?: EnquiryLook;
  /** "Cabin", "Tent": what the lodge calls its rooms */
  roomWord?: string;
}) {
  const booking = useBooking();
  const today = todayInHarare();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const room = rooms.find((entry) => entry.id === roomId) ?? rooms[0];
  const most = Math.min(12, Math.max(2, room?.sleeps ?? 2));
  const [guests, setGuests] = useState(2);
  const shownGuests = Math.min(guests, most);
  if (!whatsapp || !room) return null;
  const layout = look.layout ?? "stacked";

  function send() {
    if (!room) return;
    if (booking.online) {
      booking.open(room.id, { checkIn: checkIn || undefined, checkOut: checkOut || undefined, guests: shownGuests });
      return;
    }
    const when = checkIn && checkOut ? ` from ${shortDay(checkIn)} to ${shortDay(checkOut)}` : checkIn ? ` from ${shortDay(checkIn)}` : "";
    const text = `Hi ${lodge}, I'd like to book the ${room.name}${when}, for ${shownGuests} ${shownGuests === 1 ? "guest" : "guests"}.${when ? "" : " My dates are: "}`;
    booking.trackChat(room.id);
    globalThis.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        onPointerDown={booking.online ? booking.preload : undefined}
        className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end", look.className)}
        aria-label="Check your dates"
      >
        <Field label={roomWord} look={look} layout={layout}>
          <Select value={room.id} onChange={setRoomId} label={roomWord} options={rooms.map((entry) => ({ value: entry.id, label: entry.name }))} />
        </Field>
        <Field label="Arrive" look={look} layout={layout}>
          <DateInput
            value={checkIn}
            min={today}
            label="Arrive"
            onChange={(value) => {
              setCheckIn(value);
              if (checkOut && checkOut <= value) setCheckOut("");
            }}
          />
        </Field>
        <Field label="Leave" look={look} layout={layout}>
          <DateInput value={checkOut} min={checkIn ? dateAdd(checkIn, 1) : dateAdd(today, 1)} label="Leave" onChange={setCheckOut} />
        </Field>
        <Field label="Guests" look={look} layout={layout}>
          <Select
            value={String(shownGuests)}
            onChange={(value) => setGuests(Number(value))}
            label="Guests"
            options={Array.from({ length: most }, (_, index) => ({ value: String(index + 1), label: `${index + 1} ${index === 0 ? "guest" : "guests"}` }))}
          />
        </Field>
        <button
          type="submit"
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold whitespace-nowrap transition-transform active:scale-[0.98] motion-reduce:transform-none sm:col-span-2 lg:col-span-1",
            booking.online ? "bg-[var(--theme)] text-white" : "bg-[#25D366] text-[#0C181F]",
            look.button,
          )}
        >
          {booking.online ? <CalendarDays className="size-[18px]" /> : <WhatsAppIcon size={18} />}
          {booking.online ? "Check dates" : "Send on WhatsApp"}
        </button>
      </form>
      {look.hint === null ? null : (
        <p className={cn("px-1 text-xs", look.hint)}>
          {booking.online
            ? "See which nights are free and book in a minute."
            : `Opens WhatsApp with your ${roomWord.toLowerCase()} and dates filled in. We reply to confirm.`}
        </p>
      )}
    </div>
  );
}

function Field({ label, look, layout, children }: { label: string; look: EnquiryLook; layout: "stacked" | "inline"; children: ReactNode }) {
  if (layout === "inline") {
    return (
      <div className={cn("relative flex h-14 flex-col justify-center rounded-full border border-black/10 bg-white px-5", look.field)}>
        <span aria-hidden="true" className={cn("text-[11px] leading-4 font-semibold text-[#6C767D]", look.label)}>
          {label}
        </span>
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden="true" className={cn("px-1 text-xs font-medium text-[#4F5A60]", look.label)}>
        {label}
      </span>
      <div className={cn("relative flex h-12 items-center rounded-full border border-black/10 bg-white px-4", look.field)}>{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  const chosen = options.find((option) => option.value === value)?.label ?? "";
  // The shown text sits under an invisible native select that covers the whole field
  return (
    <span className="flex w-full items-center justify-between gap-2">
      <span aria-hidden="true" className="truncate text-[15px] font-medium">
        {chosen}
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-60" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Shows "Mon 12 Oct"; a tap opens the phone's own date picker. */
function DateInput({ value, min, label, onChange }: { value: string; min: string; label: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  // The native input covers the whole field (its nearest positioned box)
  return (
    <span className="flex w-full items-center">
      <span aria-hidden="true" className={cn("truncate text-[15px] font-medium", !value && "opacity-55")}>
        {value ? shortDay(value) : "Add date"}
      </span>
      <input
        ref={input}
        id={id}
        type="date"
        value={value}
        min={min}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        onClick={() => {
          try {
            input.current?.showPicker();
          } catch {
            // Older browsers open their picker on focus anyway
          }
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </span>
  );
}
