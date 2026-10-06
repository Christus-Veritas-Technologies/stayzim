import { describe, expect, test } from "bun:test";

import { canHold, fillsLast, fullNights, occupancy, overbookedNights } from "./content/availability";
import { dateAdd, dateAddMonths, eachNight, formatStay, isDateString, nightsBetween, staysOverlap, todayInHarare } from "./content/dates";
import { lodgePatch, publicSiteSchema, roomInput } from "./content/schemas";

describe("dates", () => {
  test("only real dates pass", () => {
    expect(isDateString("2026-10-12")).toBe(true);
    expect(isDateString("2028-02-29")).toBe(true);
    expect(isDateString("2026-02-29")).toBe(false);
    expect(isDateString("2026-13-01")).toBe(false);
    expect(isDateString("12/10/2026")).toBe(false);
  });

  test("adding days crosses months, years and leap days", () => {
    expect(dateAdd("2026-10-31", 1)).toBe("2026-11-01");
    expect(dateAdd("2026-12-31", 1)).toBe("2027-01-01");
    expect(dateAdd("2028-02-28", 1)).toBe("2028-02-29");
    expect(dateAdd("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("nights are check-in up to, not including, check-out", () => {
    expect(nightsBetween("2026-10-12", "2026-10-15")).toBe(3);
    expect(eachNight("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(eachNight("2026-10-12", "2026-10-12")).toEqual([]);
  });

  test("back-to-back stays don't overlap", () => {
    expect(staysOverlap({ checkIn: "2026-10-10", checkOut: "2026-10-12" }, { checkIn: "2026-10-12", checkOut: "2026-10-14" })).toBe(false);
    expect(staysOverlap({ checkIn: "2026-10-10", checkOut: "2026-10-13" }, { checkIn: "2026-10-12", checkOut: "2026-10-14" })).toBe(true);
  });

  test("today is today in Harare (UTC+2)", () => {
    expect(todayInHarare(new Date("2026-10-11T21:59:00Z"))).toBe("2026-10-11");
    expect(todayInHarare(new Date("2026-10-11T22:00:00Z"))).toBe("2026-10-12");
  });

  test("months on keep the day, or the month's last", () => {
    expect(dateAddMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(dateAddMonths("2026-10-12", 18)).toBe("2028-04-12");
  });

  test("stays read naturally", () => {
    expect(formatStay("2026-10-12", "2026-10-15")).toBe("12–15 Oct");
    expect(formatStay("2026-10-30", "2026-11-02")).toBe("30 Oct – 2 Nov");
    expect(formatStay("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027");
  });
});

describe("availability", () => {
  const holds = [
    { checkIn: "2026-10-10", checkOut: "2026-10-13", quantity: 2 },
    { checkIn: "2026-10-12", checkOut: "2026-10-14", quantity: 1 },
    { checkIn: "2026-10-20", checkOut: "2026-10-22", quantity: 3 },
  ];

  test("counts rooms taken per night", () => {
    const taken = occupancy(holds, "2026-10-11", "2026-10-15");
    expect([...taken]).toEqual([
      ["2026-10-11", 2],
      ["2026-10-12", 3],
      ["2026-10-13", 1],
      ["2026-10-14", 0],
    ]);
  });

  test("a night is full when every room is taken", () => {
    expect(fullNights(3, holds, "2026-10-01", "2026-10-31")).toEqual(["2026-10-12", "2026-10-20", "2026-10-21"]);
    expect(fullNights(1, [], "2026-10-01", "2026-10-03")).toEqual([]);
  });

  test("a stay fits only when every night has room", () => {
    expect(canHold(3, holds, { checkIn: "2026-10-13", checkOut: "2026-10-15", quantity: 2 })).toEqual({ ok: true });
    expect(canHold(3, holds, { checkIn: "2026-10-11", checkOut: "2026-10-14", quantity: 1 })).toEqual({ ok: false, fullOn: "2026-10-12" });
    expect(canHold(1, [], { checkIn: "2026-10-11", checkOut: "2026-10-12", quantity: 2 })).toEqual({ ok: false, fullOn: "2026-10-11" });
  });

  test("warns when a stay takes the last room", () => {
    expect(fillsLast(3, holds, { checkIn: "2026-10-10", checkOut: "2026-10-12", quantity: 1 })).toBe("2026-10-10");
    expect(fillsLast(6, holds, { checkIn: "2026-10-10", checkOut: "2026-10-12", quantity: 1 })).toBeNull();
  });

  test("finds nights with more booked than rooms", () => {
    expect(overbookedNights(2, holds, "2026-10-10", "2026-10-22")).toEqual([
      { night: "2026-10-12", taken: 3 },
      { night: "2026-10-20", taken: 3 },
      { night: "2026-10-21", taken: 3 },
    ]);
  });
});

describe("schemas", () => {
  test("a room needs a name and a whole price", () => {
    expect(roomInput.safeParse({ name: "Hillside", price: 95, sleeps: 2 }).success).toBe(true);
    expect(roomInput.safeParse({ name: "", price: 95, sleeps: 2 }).error?.issues[0]?.message).toBe("Add the room name");
    expect(roomInput.safeParse({ name: "Hillside", price: 95.5, sleeps: 2 }).error?.issues[0]?.message).toBe("Use whole dollars");
    expect(roomInput.safeParse({ name: "x".repeat(61), price: 95, sleeps: 2 }).success).toBe(false);
    expect(roomInput.safeParse({ name: "Hillside", price: 95, sleeps: 2, amenities: ["spa"] }).success).toBe(false);
  });

  test("lodge text: empty means remove, phones lose their formatting", () => {
    const parsed = lodgePatch.parse({ town: "  ", whatsapp: "+263 77 123 4567" });
    expect(parsed).toEqual({ town: null, whatsapp: "263771234567" });
    expect(lodgePatch.safeParse({ whatsapp: "+263 077 123 4567" }).error?.issues[0]?.message).toContain("Remove the 0");
  });

  test("a lodge site from an older API still parses, with defaults", () => {
    const site = publicSiteSchema.parse({
      status: "LIVE",
      slug: "mistvalley",
      name: "Mist Valley",
      template: "growth-classic",
      hero: { headline: "Mist Valley", subline: "Rest" },
      themeColor: "#1E4A3B",
      rooms: [{ id: "r1", name: "Hillside", price: 95, sleeps: 2, amenities: ["wifi", "from-a-newer-api"] }],
    });
    if (site.status !== "LIVE") throw new Error("expected a live site");
    expect(site.demo).toBe(false);
    expect(site.gallery).toEqual([]);
    expect(site.rooms[0]?.amenities).toEqual(["wifi"]);
    expect(site.rooms[0]?.photos).toEqual([]);
  });
});
