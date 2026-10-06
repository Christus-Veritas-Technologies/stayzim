import { describe, expect, test } from "bun:test";

import { formatBytes, formatDate, formatDayMonth, formatShortWhen, formatWeekday, formatWhen, percentChange } from "./format";

// Tests run in Zimbabwe time (test/setup.ts)
const now = new Date("2026-10-14T10:42:00+02:00");

describe("dates", () => {
  test("read the way owners say them", () => {
    expect(formatDate(now)).toBe("Wed 14 October");
    expect(formatDayMonth(now)).toBe("14 Oct");
  });

  test("say today and yesterday instead of the date", () => {
    expect(formatWhen(now, now)).toBe("Today, 10:42");
    expect(formatWhen(new Date("2026-10-13T18:05:00+02:00"), now)).toBe("Yesterday, 18:05");
    expect(formatWhen(new Date("2026-10-04T21:47:00+02:00"), now)).toBe("Sun 4 Oct, 21:47");
  });

  test("shorten for tables and chart axes", () => {
    expect(formatShortWhen(new Date("2026-10-14T07:05:00+02:00"), now)).toBe("07:05");
    expect(formatShortWhen(new Date("2026-10-12T07:05:00+02:00"), now)).toBe("Mon 12 Oct");
    expect(formatWeekday(now, now)).toBe("Today");
    expect(formatWeekday(new Date("2026-10-13T12:00:00+02:00"), now)).toBe("Tue");
  });

  test("use Zimbabwe midnight, not UTC midnight", () => {
    // 23:30 UTC on the 13th is already the 14th in Harare
    expect(formatWhen(new Date("2026-10-13T23:30:00Z"), now)).toBe("Today, 01:30");
  });
});

describe("formatBytes", () => {
  test("shows KB below a megabyte and one decimal above", () => {
    expect(formatBytes(200)).toBe("1 KB");
    expect(formatBytes(350 * 1024)).toBe("350 KB");
    expect(formatBytes(1.24 * 1024 * 1024)).toBe("1.2 MB");
  });
});

describe("percentChange", () => {
  test("compares against the period before", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });

  test("is null with nothing to compare against", () => {
    expect(percentChange(12, 0)).toBeNull();
  });
});
