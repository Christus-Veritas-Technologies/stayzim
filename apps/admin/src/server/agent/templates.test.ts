import { describe, expect, test } from "bun:test";

import { followUpMessage, freeDomain, localPhone, paidMessage, siteOptionsMessage } from "./templates";

const BEFORE_DEADLINE = new Date("2026-10-15T10:00:00Z");

describe("siteOptionsMessage", () => {
  test("three sites, as sent to Hardy House: under 600 characters, the right prices, 1, 2 or 3", () => {
    const message = siteOptionsMessage({
      lodge: "Hardy House",
      city: "Bulawayo",
      now: BEFORE_DEADLINE,
      sites: [
        { plan: "PRO", url: "https://hardy-house-2.stayzim.co.zw", monthlyPrice: 50 },
        { plan: "STARTER", url: "https://hardy-house.stayzim.co.zw", monthlyPrice: 15 },
        { plan: "GROWTH", url: "https://hardy-house-bulawayo.stayzim.co.zw", monthlyPrice: 30 },
      ],
    });
    expect(message.length).toBeLessThan(600);
    expect(message).toContain("1. $15/month: a single page");
    expect(message).toContain("2. $30/month: each room gets its own page");
    expect(message).toContain("3. $50/month (normally $75): adds reviews, your story and things to do in Bulawayo");
    expect(message).toContain("https://hardy-house-2.stayzim.co.zw/");
    expect(message).toContain("Which one do you like, 1, 2 or 3?");
    expect(message).toContain("until 22 October");
    expect(message).toContain("hardyhouse.co.zw is free");
  });

  test("two sites, with their name", () => {
    const message = siteOptionsMessage({
      lodge: "Sanja Lodge",
      city: "Kwekwe",
      name: "Brian Kausa",
      now: BEFORE_DEADLINE,
      sites: [
        { plan: "STARTER", url: "https://sanja-lodge.stayzim.co.zw", monthlyPrice: 15 },
        { plan: "GROWTH", url: "https://sanja-lodge-kwekwe.stayzim.co.zw", monthlyPrice: 30 },
      ],
    });
    expect(message.startsWith("Hi Brian, here's Sanja Lodge's website in two versions:")).toBe(true);
    expect(message).toContain("Which one do you like, 1 or 2?");
    expect(message).not.toContain("normally");
    expect(message.length).toBeLessThan(600);
  });

  test("after the deadline: no deadline line", () => {
    const message = siteOptionsMessage({ lodge: "X Lodge", city: "Gweru", now: new Date("2026-11-01T00:00:00Z"), sites: [{ plan: "STARTER", url: "https://x.stayzim.co.zw", monthlyPrice: 25 }] });
    expect(message).not.toContain("only until");
    expect(message).toContain("Do you like it? And xlodge.co.zw is free");
  });
});

test("helpers", () => {
  expect(freeDomain("Hardy House")).toBe("hardyhouse.co.zw");
  expect(localPhone("263773567534")).toBe("077 356 7534");
  expect(followUpMessage(1, { lodge: "Sanja Lodge", name: "Brian K", options: 2 })).toContain("Which one would you go with, 1 or 2?");
  expect(paidMessage({ lodge: "Sanja Lodge", siteUrl: "https://sanja-lodge.stayzim.co.zw", claimUrl: "https://stayzim.co.zw/claim/abc", paidUntil: "2026-11-15T10:00:00Z" })).toContain(
    "live until 15 November:\nhttps://sanja-lodge.stayzim.co.zw/",
  );
});
