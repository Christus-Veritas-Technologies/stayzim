import { describe, expect, test } from "bun:test";

import {
  addMonths,
  annualMonthlyPrice,
  annualSaving,
  calendarDaysUntil,
  demoEnded,
  extendPaidUntil,
  includesFreeDomain,
  isValidSlug,
  noticeFor,
  planPrice,
  planPriceCents,
  slugFromName,
  slugProblem,
  statusFor,
} from "./index";

const at = (iso: string) => new Date(iso);

describe("plans", () => {
  test("prices in cents, for several months", () => {
    expect(planPriceCents("GROWTH")).toBe(4000);
    expect(planPriceCents("GROWTH", 3)).toBe(12000);
    expect(planPriceCents("PRO", 12)).toBe(63000);
  });

  test("12 months take 10, 17 and 30% off, rounded down", () => {
    expect(planPrice("STARTER", 12)).toBe(216);
    expect(planPrice("GROWTH", 12)).toBe(398);
    expect(planPrice("PRO", 12)).toBe(630);
    expect([annualMonthlyPrice("STARTER"), annualMonthlyPrice("GROWTH"), annualMonthlyPrice("PRO")]).toEqual([18, 33, 52]);
    expect([annualSaving("STARTER"), annualSaving("GROWTH"), annualSaving("PRO")]).toEqual([24, 82, 270]);
  });

  test("free .co.zw domain on Growth and Pro", () => {
    expect(includesFreeDomain("STARTER")).toBe(false);
    expect(includesFreeDomain("GROWTH")).toBe(true);
    expect(includesFreeDomain("PRO")).toBe(true);
  });
});

describe("slugs", () => {
  test("come from the lodge name", () => {
    expect(slugFromName("Mist Valley Lodge")).toBe("mist-valley-lodge");
    expect(slugFromName("  Rudo's B&B, Nyanga! ")).toBe("rudos-b-and-b-nyanga");
    expect(slugFromName("Café Élan")).toBe("cafe-elan");
    const long = slugFromName("The Very Long Name Of A Lodge Somewhere In The Eastern Highlands");
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("-")).toBe(false);
  });

  test("reserved words, length and hyphens are refused", () => {
    expect(isValidSlug("mistvalley")).toBe(true);
    for (const slug of ["app", "signup", "ab", "-mist", "mist-", "mist--valley", "Mist"]) expect(isValidSlug(slug)).toBe(false);
    expect(slugProblem("ab")).toContain("at least 3");
    expect(slugProblem("api")).toContain("reserved");
    expect(slugProblem("mist-valley")).toBeNull();
  });
});

describe("billing dates", () => {
  test("calendar days count in Harare time", () => {
    // 23:30 UTC on the 5th is 01:30 on the 6th in Harare
    expect(calendarDaysUntil(at("2026-10-06T10:00:00Z"), at("2026-10-05T23:30:00Z"))).toBe(0);
    expect(calendarDaysUntil(at("2026-10-09T10:00:00Z"), at("2026-10-06T08:00:00Z"))).toBe(3);
    expect(calendarDaysUntil(at("2026-10-05T10:00:00Z"), at("2026-10-06T08:00:00Z"))).toBe(-1);
  });

  test("months add on the calendar, clamped to the month's last day", () => {
    expect(addMonths(at("2026-01-31T09:00:00Z"), 1).toISOString()).toBe("2026-02-28T09:00:00.000Z");
    expect(addMonths(at("2026-10-06T09:00:00Z"), 12).toISOString()).toBe("2027-10-06T09:00:00.000Z");
  });

  test("paying extends from paid-until when it's ahead, else from now", () => {
    const now = at("2026-10-06T09:00:00Z");
    expect(extendPaidUntil(at("2026-10-20T00:00:00Z"), now, 1).toISOString()).toBe("2026-11-20T00:00:00.000Z");
    expect(extendPaidUntil(at("2026-09-01T00:00:00Z"), now, 1).toISOString()).toBe("2026-11-06T09:00:00.000Z");
    expect(extendPaidUntil(null, now, 3).toISOString()).toBe("2027-01-06T09:00:00.000Z");
  });

  test("invoice reminders: 3 days before, the day before and the day itself", () => {
    const due = at("2026-10-10T08:00:00Z");
    expect(noticeFor(due, at("2026-10-06T08:00:00Z"))).toBeNull();
    expect(noticeFor(due, at("2026-10-07T08:00:00Z"))).toBe("DUE_IN_3");
    expect(noticeFor(due, at("2026-10-08T08:00:00Z"))).toBe("DUE_IN_3");
    expect(noticeFor(due, at("2026-10-09T08:00:00Z"))).toBe("DUE_IN_1");
    expect(noticeFor(due, at("2026-10-10T20:00:00Z"))).toBe("DUE_TODAY");
    expect(noticeFor(due, at("2026-10-11T08:00:00Z"))).toBeNull();
  });

  test("status: payment due when the period ends, offline 3 days later", () => {
    const paidUntil = at("2026-10-10T08:00:00Z");
    expect(statusFor({ status: "ACTIVE", paidUntil }, at("2026-10-09T08:00:00Z"))).toBe("ACTIVE");
    expect(statusFor({ status: "ACTIVE", paidUntil }, at("2026-10-10T08:00:00Z"))).toBe("OVERDUE");
    expect(statusFor({ status: "OVERDUE", paidUntil }, at("2026-10-13T07:59:00Z"))).toBe("OVERDUE");
    expect(statusFor({ status: "OVERDUE", paidUntil }, at("2026-10-13T08:00:00Z"))).toBe("SUSPENDED");
    expect(statusFor({ status: "ACTIVE", paidUntil: null }, at("2030-01-01T00:00:00Z"))).toBe("ACTIVE");
    expect(statusFor({ status: "DEMO", paidUntil: null }, at("2030-01-01T00:00:00Z"))).toBe("DEMO");
  });

  test("a demo ends when its time is up", () => {
    const lodge = { status: "DEMO" as const, demoEndsAt: at("2026-10-08T09:00:00Z") };
    expect(demoEnded(lodge, at("2026-10-08T08:59:00Z"))).toBe(false);
    expect(demoEnded(lodge, at("2026-10-08T09:00:00Z"))).toBe(true);
    expect(demoEnded({ status: "ACTIVE", demoEndsAt: null }, at("2030-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("formatting", () => {
  test("dates in Zimbabwe time, amounts in dollars", async () => {
    const { formatCents, formatHarareDate, formatHarareDateTime, formatHarareDay } = await import("./index");
    // 22:30 UTC is 00:30 the next day in Harare
    expect(formatHarareDate(at("2026-10-07T22:30:00Z"))).toBe("Thursday 8 October");
    expect(formatHarareDateTime(at("2026-10-07T22:30:00Z"))).toBe("Thursday 8 October at 00:30");
    expect(formatHarareDay(at("2026-10-07T22:30:00Z"))).toBe("8 October 2026");
    expect(formatCents(4000)).toBe("$40.00");
    expect(formatCents(90000)).toBe("$900.00");
  });
});
