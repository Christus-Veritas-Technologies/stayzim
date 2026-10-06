import { dateAdd, eachNight, formatDay, formatStay, nightsBetween, occupancy, type DashboardBooking, type Hold } from "@stayzim/sites";

export type { BookingsWindow, DashboardBooking } from "@stayzim/sites";

/** The status as owners read it. */
export function bookingStatus(booking: Pick<DashboardBooking, "status" | "expired" | "kind">) {
  if (booking.kind === "BLOCK") return booking.status === "CANCELLED" ? { label: "Reopened", tone: "neutral" as const } : { label: "Closed", tone: "neutral" as const };
  if (booking.expired) return { label: "Expired", tone: "neutral" as const };
  switch (booking.status) {
    case "REQUESTED":
      return { label: "Request", tone: "purple" as const };
    case "CONFIRMED":
      return { label: "Confirmed", tone: "success" as const };
    case "DECLINED":
      return { label: "Declined", tone: "neutral" as const };
    case "CANCELLED":
      return { label: "Cancelled", tone: "danger" as const };
  }
}

/** "12–15 Oct · 3 nights" */
export function stayLine(booking: Pick<DashboardBooking, "checkIn" | "checkOut">) {
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  return `${formatStay(booking.checkIn, booking.checkOut)} · ${nights} ${nights === 1 ? "night" : "nights"}`;
}

/** Holds of one room (confirmed stays and closed dates), leaving one booking out. */
export function holdsOf(bookings: DashboardBooking[], roomId: string, except?: string): Hold[] {
  return bookings.filter((booking) => booking.roomId === roomId && booking.status === "CONFIRMED" && booking.id !== except);
}

/** Nights with no room of this type left, for the date pickers. */
export function fullNightsOf(units: number, holds: Hold[], from: string, to: string) {
  return new Set([...occupancy(holds, from, to)].filter(([, taken]) => taken >= units).map(([night]) => night));
}

/** What a booking would do to the calendar: fill the last room on a night, or not fit at all. */
export function confirmWarning(units: number, holds: Hold[], stay: Pick<DashboardBooking, "checkIn" | "checkOut" | "quantity" | "roomName">) {
  const taken = occupancy(holds, stay.checkIn, stay.checkOut);
  for (const night of eachNight(stay.checkIn, stay.checkOut)) {
    if ((taken.get(night) ?? 0) + stay.quantity > units) return { kind: "full" as const, text: `${stay.roomName} is full on ${formatDay(night)}. Change the room or dates first.` };
  }
  for (const night of eachNight(stay.checkIn, stay.checkOut)) {
    if ((taken.get(night) ?? 0) + stay.quantity === units) {
      return { kind: "last" as const, text: units === 1 ? `This books ${stay.roomName} on ${formatDay(night)}.` : `This fills your last ${stay.roomName} on ${formatDay(night)}.` };
    }
  }
  return null;
}

/** Monday of the week a date falls in. */
export function weekStart(date: string) {
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return dateAdd(date, -weekday);
}

function firstName(name: string | null) {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

/** Ready-made WhatsApp messages from the owner to the guest. */
export const bookingMessages = {
  confirmed(booking: DashboardBooking, lodge: { name: string; checkInFrom: string | null }) {
    const guests = booking.guests ? `, ${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}` : "";
    const checkIn = lodge.checkInFrom ? ` Check-in from ${lodge.checkInFrom}.` : "";
    return `Hi ${firstName(booking.guestName)}, your booking at ${lodge.name} is confirmed: ${booking.roomName}, ${formatStay(booking.checkIn, booking.checkOut)} (${booking.nights} ${booking.nights === 1 ? "night" : "nights"}${guests}). Total $${booking.total}.${checkIn} Reference ${booking.reference}.`;
  },
  declined(booking: DashboardBooking, lodge: { name: string }, reason?: string | null) {
    return `Hi ${firstName(booking.guestName)}, sorry, ${lodge.name} is full for ${formatStay(booking.checkIn, booking.checkOut)}.${reason ? ` ${reason}` : ""}`;
  },
  cancelled(booking: DashboardBooking, lodge: { name: string }, reason?: string | null) {
    return `Hi ${firstName(booking.guestName)}, your booking at ${lodge.name} for ${formatStay(booking.checkIn, booking.checkOut)} is cancelled.${reason ? ` ${reason}` : ""} Reference ${booking.reference}.`;
  },
  hello(booking: DashboardBooking, lodge: { name: string }) {
    return `Hi ${firstName(booking.guestName)}, this is ${lodge.name} about your booking for ${formatStay(booking.checkIn, booking.checkOut)} (${booking.reference}). `;
  },
};

/** wa.me link to the guest with a message typed in; null without their number. */
export function guestChatUrl(booking: Pick<DashboardBooking, "guestPhone">, text: string) {
  return booking.guestPhone ? `https://wa.me/${booking.guestPhone}?text=${encodeURIComponent(text)}` : null;
}
