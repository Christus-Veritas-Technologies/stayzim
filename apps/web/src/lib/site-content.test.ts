import { describe, expect, test } from "bun:test";

import { hasStayInfo, roomFacts, stayFacts } from "./site-content";

describe("roomFacts", () => {
  test("lists what the owner filled in, in order", () => {
    expect(roomFacts({ sleeps: 4, beds: "1 queen + 2 singles", size: 32 })).toEqual(["Sleeps 4", "1 queen + 2 singles", "32 m²"]);
  });

  test("leaves out what's missing", () => {
    expect(roomFacts({ sleeps: 2, beds: null, size: null })).toEqual(["Sleeps 2"]);
    expect(roomFacts({ sleeps: 2, beds: null, size: 18 })).toEqual(["Sleeps 2", "18 m²"]);
  });
});

describe("stayFacts", () => {
  test("reads the times the owner set", () => {
    expect(stayFacts({ checkInFrom: "14:00", checkOutBy: "10:00" })).toBe("Check-in from 14:00 · Check-out by 10:00");
    expect(stayFacts({ checkInFrom: null, checkOutBy: "10:00" })).toBe("Check-out by 10:00");
    expect(stayFacts({ checkInFrom: null, checkOutBy: null })).toBeNull();
  });

  test("Good to know shows when anything is filled in", () => {
    expect(hasStayInfo({ checkInFrom: null, checkOutBy: null, houseRules: [], cancellationPolicy: null })).toBe(false);
    expect(hasStayInfo({ checkInFrom: null, checkOutBy: null, houseRules: ["No pets"], cancellationPolicy: null })).toBe(true);
  });
});
