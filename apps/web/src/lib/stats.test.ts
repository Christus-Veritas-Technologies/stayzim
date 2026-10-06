import { describe, expect, test } from "bun:test";

import { periodLabel, periodRange, previousLabel } from "./stats";

const now = new Date("2026-10-14T10:42:00+02:00");

describe("periods", () => {
  test("name themselves", () => {
    expect(periodLabel("today")).toBe("Today");
    expect(periodLabel("7d")).toBe("Last 7 days");
    expect(periodLabel("90d")).toBe("Last 90 days");
  });

  test("count today as the last day of the range", () => {
    expect(periodRange("today", now)).toBe("Today");
    expect(periodRange("7d", now)).toBe("Thu 8 Oct to today");
    expect(periodRange("30d", now)).toBe("Tue 15 Sep to today");
  });

  test("say what they're compared with", () => {
    expect(previousLabel("today")).toBe("yesterday");
    expect(previousLabel("7d")).toBe("the week before");
    expect(previousLabel("30d")).toBe("the 30 days before");
  });
});
