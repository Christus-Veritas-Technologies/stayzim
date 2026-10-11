import { describe, expect, test } from "bun:test";

import {
  addMonths,
  annualDeal,
  annualMonthlyPrice,
  annualSaving,
  calendarDaysUntil,
  carriedOverMs,
  demoEnded,
  extendPaidUntil,
  foundingOpen,
  foundingReminderDue,
  canClaimDomain,
  domainStillFree,
  freeDomainName,
  isValidSlug,
  noticeFor,
  monthlyPrice,
  paidUntilAfterPayment,
  planPrice,
  planPriceCents,
  previewReminderFor,
  slugFromName,
  slugProblem,
  statusFor,
} from "./index";

const at = (iso: string) => new Date(iso);

describe("plans", () => {
  test("prices in cents, for several months", () => {
    expect(planPriceCents("GROWTH", 1, false)).toBe(4000);
    expect(planPriceCents("GROWTH", 3, false)).toBe(12000);
    expect(planPriceCents("PRO", 12, false)).toBe(63000);
    expect(planPriceCents("GROWTH", 1, true)).toBe(3000);
    expect(planPriceCents("STARTER", 3, true)).toBe(4500);
  });

  test("normal prices: 12 months take 10, 17 and 30% off, rounded down", () => {
    expect([monthlyPrice("STARTER", false), monthlyPrice("GROWTH", false), monthlyPrice("PRO", false)]).toEqual([25, 40, 75]);
    expect(planPrice("STARTER", 12, false)).toBe(270);
    expect(planPrice("GROWTH", 12, false)).toBe(398);
    expect(planPrice("PRO", 12, false)).toBe(630);
    expect([annualMonthlyPrice("STARTER", false), annualMonthlyPrice("GROWTH", false), annualMonthlyPrice("PRO", false)]).toEqual([22, 33, 52]);
    expect([annualSaving("STARTER", false), annualSaving("GROWTH", false), annualSaving("PRO", false)]).toEqual([30, 82, 270]);
    expect(annualDeal("GROWTH", false)).toBe("17% off");
  });

  test("founding prices: $15, $30 and $50, and a year is 2 months free", () => {
    expect([monthlyPrice("STARTER", true), monthlyPrice("GROWTH", true), monthlyPrice("PRO", true)]).toEqual([15, 30, 50]);
    expect([planPrice("STARTER", 12, true), planPrice("GROWTH", 12, true), planPrice("PRO", 12, true)]).toEqual([150, 300, 500]);
    expect([annualSaving("STARTER", true), annualSaving("GROWTH", true), annualSaving("PRO", true)]).toEqual([30, 60, 100]);
    expect(annualDeal("PRO", true)).toBe("2 months free");
  });

  test("free preview reminders: day 3, then day 10, in Harare days", () => {
    const signedUp = at("2026-10-11T20:30:00Z"); // 22:30 on the 11th in Harare
    expect(previewReminderFor(signedUp, at("2026-10-13T09:00:00Z"))).toBeNull();
    expect(previewReminderFor(signedUp, at("2026-10-14T06:00:00Z"))).toBe("DAY_3");
    expect(previewReminderFor(signedUp, at("2026-10-19T09:00:00Z"))).toBe("DAY_3");
    expect(previewReminderFor(signedUp, at("2026-10-21T06:00:00Z"))).toBe("DAY_10");
  });

  test("the founding reminder goes on 20 October, Harare time", () => {
    expect(foundingReminderDue(at("2026-10-19T21:59:00Z"))).toBe(false); // 23:59 on the 19th
    expect(foundingReminderDue(at("2026-10-19T22:00:00Z"))).toBe(true); // midnight, the 20th
    expect(foundingReminderDue(at("2026-10-20T21:59:00Z"))).toBe(true);
    expect(foundingReminderDue(at("2026-10-20T22:00:00Z"))).toBe(false);
  });

  test("founding prices end at 23:59 on 22 October, Harare time", () => {
    expect(foundingOpen(at("2026-10-11T08:00:00Z"))).toBe(true);
    expect(foundingOpen(at("2026-10-22T21:59:59Z"))).toBe(true); // 23:59:59 in Harare
    expect(foundingOpen(at("2026-10-22T22:00:00Z"))).toBe(false); // midnight in Harare
    expect(foundingOpen(at("2027-01-01T00:00:00Z"))).toBe(false);
  });

  test("free .co.zw domain on Growth and Pro", () => {
    expect(domainStillFree(undefined)).toBe(true);
    expect(domainStillFree("true")).toBe(true);
    expect(domainStillFree(" FALSE ")).toBe(false);
    expect(canClaimDomain("ACTIVE")).toBe(true);
    expect(canClaimDomain("OVERDUE")).toBe(true);
    expect(canClaimDomain("DEMO")).toBe(false);
    expect(canClaimDomain("SUSPENDED")).toBe(false);
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

  test("changing plan carries the time left over at the two prices, in whole days", () => {
    const now = at("2026-10-06T09:00:00Z");
    const twelveDays = at("2026-10-18T09:00:00Z");
    const day = 86_400_000;
    expect(carriedOverMs(twelveDays, now, "GROWTH", "GROWTH", false)).toBe(12 * day);
    expect(carriedOverMs(twelveDays, now, "STARTER", "GROWTH", false)).toBe(7 * day); // 12 × 25 / 40 = 7.5
    expect(carriedOverMs(twelveDays, now, "GROWTH", "PRO", false)).toBe(6 * day); // 12 × 40 / 75 = 6.4
    expect(carriedOverMs(twelveDays, now, "PRO", "STARTER", false)).toBe(36 * day);
    expect(carriedOverMs(at("2026-10-01T00:00:00Z"), now, "GROWTH", "PRO", false)).toBe(0);
    expect(carriedOverMs(null, now, "GROWTH", "PRO", false)).toBe(0);
    // A founding lodge moves at its founding prices
    expect(carriedOverMs(twelveDays, now, "STARTER", "GROWTH", true)).toBe(6 * day);
    expect(carriedOverMs(twelveDays, now, "GROWTH", "PRO", true)).toBe(7 * day); // 12 × 30 / 50 = 7.2
    // Upgrading with 12 days of Growth left: 6 days of Pro, then the month
    expect(paidUntilAfterPayment({ paidUntil: twelveDays, plan: "GROWTH", founding: false }, "PRO", 1, now).toISOString()).toBe("2026-11-12T09:00:00.000Z");
    expect(paidUntilAfterPayment({ paidUntil: twelveDays, plan: "GROWTH", founding: true }, "PRO", 1, now).toISOString()).toBe("2026-11-13T09:00:00.000Z");
    // The same plan extends from paid-until, as before
    expect(paidUntilAfterPayment({ paidUntil: twelveDays, plan: "GROWTH", founding: false }, "GROWTH", 1, now).toISOString()).toBe("2026-11-18T09:00:00.000Z");
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

describe("free domain names", () => {
  test("tidy what the owner typed into a .co.zw name", () => {
    expect(freeDomainName("mistvalleylodge")).toBe("mistvalleylodge.co.zw");
    expect(freeDomainName("MistValley Lodge")).toBe("mistvalleylodge.co.zw");
    expect(freeDomainName("https://www.mistvalleylodge.co.zw/")).toBe("mistvalleylodge.co.zw");
    expect(freeDomainName("mist-valley")).toBe("mist-valley.co.zw");
  });

  test("refuse names that can't be registered", () => {
    expect(freeDomainName("ab")).toBeNull();
    expect(freeDomainName("-mist")).toBeNull();
    expect(freeDomainName("mist--valley")).toBeNull();
    expect(freeDomainName("mist.valley")).toBeNull();
    expect(freeDomainName("")).toBeNull();
  });
});
