import { describe, expect, test } from "bun:test";

import { formatCountdown, splitTimeLeft } from "./lodge";

const SECOND = 1000;

describe("demo countdown", () => {
  test("splits time left into days, hours, minutes and seconds", () => {
    expect(splitTimeLeft((86_400 + 8 * 3600 + 12 * 60 + 45) * SECOND + 400)).toEqual({ days: 1, hours: 8, minutes: 12, seconds: 45 });
    expect(splitTimeLeft(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  test("reads to the second", () => {
    expect(formatCountdown((86_400 + 8 * 3600 + 12 * 60 + 45) * SECOND)).toBe("1 day 08:12:45");
    expect(formatCountdown((2 * 86_400 + 5) * SECOND)).toBe("2 days 00:00:05");
    expect(formatCountdown(59 * SECOND)).toBe("00:00:59");
    expect(formatCountdown(0)).toBe("00:00:00");
  });
});
