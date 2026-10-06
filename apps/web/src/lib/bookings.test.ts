import type { DashboardBooking } from "@stayzim/sites";
import { describe, expect, test } from "bun:test";

import { bookingMessages, confirmWarning, guestChatUrl, weekStart } from "./bookings";

const booking: DashboardBooking = {
  id: "b1",
  reference: "B-7K2Q",
  kind: "STAY",
  status: "CONFIRMED",
  source: "SITE",
  roomId: "r1",
  roomName: "Standard Room",
  checkIn: "2026-10-12",
  checkOut: "2026-10-15",
  nights: 3,
  quantity: 1,
  guests: 2,
  guestName: "Tendai Moyo",
  guestPhone: "263771234567",
  guestEmail: null,
  message: null,
  notes: null,
  nightlyPrice: 95,
  total: 285,
  expired: false,
  createdAt: "2026-10-06T12:00:00.000Z",
  decidedAt: null,
  cancelledAt: null,
  cancelReason: null,
};

describe("booking messages", () => {
  test("confirmed: dates, nights, guests, total and the reference", () => {
    expect(bookingMessages.confirmed(booking, { name: "Mist Valley", checkInFrom: "14:00" })).toBe(
      "Hi Tendai, your booking at Mist Valley is confirmed: Standard Room, 12–15 Oct (3 nights, 2 guests). Total $285. Check-in from 14:00. Reference B-7K2Q.",
    );
  });

  test("declined and cancelled carry the reason when there is one", () => {
    expect(bookingMessages.declined(booking, { name: "Mist Valley" })).toBe("Hi Tendai, sorry, Mist Valley is full for 12–15 Oct.");
    expect(bookingMessages.cancelled(booking, { name: "Mist Valley" }, "The road is closed.")).toContain("is cancelled. The road is closed. Reference B-7K2Q.");
  });

  test("a chat link only with the guest's number", () => {
    expect(guestChatUrl(booking, "Hi")).toBe("https://wa.me/263771234567?text=Hi");
    expect(guestChatUrl({ guestPhone: null }, "Hi")).toBeNull();
  });
});

describe("confirmWarning", () => {
  const holds = [{ checkIn: "2026-10-13", checkOut: "2026-10-14", quantity: 3 }];

  test("full: some night has no room left", () => {
    expect(confirmWarning(3, holds, booking)?.kind).toBe("full");
  });

  test("last: it takes the last room", () => {
    expect(confirmWarning(4, holds, booking)).toEqual({ kind: "last", text: "This fills your last Standard Room on 13 Oct." });
  });

  test("nothing to say when there's room", () => {
    expect(confirmWarning(6, holds, booking)).toBeNull();
  });
});

test("weeks start on Monday", () => {
  expect(weekStart("2026-10-07")).toBe("2026-10-05");
  expect(weekStart("2026-10-05")).toBe("2026-10-05");
  expect(weekStart("2026-10-11")).toBe("2026-10-05");
});
