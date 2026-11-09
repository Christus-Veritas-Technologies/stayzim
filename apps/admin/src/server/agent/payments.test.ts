import { describe, expect, test } from "bun:test";

import { nextStep, NUDGE_AFTER_MS, WATCH_MS } from "./payments";
import type { LinkPayment, LinkStatus } from "./server-api";
import { linkInsteadMessage, localDigits, paymentFailedMessage, promptNudgeMessage, promptSentMessage, walletFor } from "./templates";

const URL = "https://stayzim.co.zw/pay/abcdefghijklmnopqrstuv";

const payment = (id: string, status: LinkPayment["status"], channelName = "EcoCash"): LinkPayment => ({
  id,
  reference: `SZP-${id}`,
  amountCents: 3000,
  channel: channelName.toLowerCase(),
  channelName,
  status,
  receiptNumber: status === "PAID" ? "R-2026-00001" : null,
});

const status = (state: LinkStatus["link"]["state"], payments: LinkPayment[]): LinkStatus => ({
  link: { url: URL, state, siteUrl: "https://hardyhouse.stayzim.co.zw", paidUntil: null, amountCents: 3000, months: 1, lodgeName: "Hardy House" },
  payments,
});

const none = { failed: false, nudged: false };

describe("nextStep: what the watch does about a link", () => {
  const prompt = { paymentId: "p1", sentAt: 0 };

  test("paid, however they paid: the prompt, or the link (card, InnBucks…) with no prompt of ours", () => {
    expect(nextStep(prompt, status("paid", [payment("p1", "PAID")]), 10_000, none)).toEqual({ kind: "paid", payment: payment("p1", "PAID") });
    // Prompt failed, then they paid on the link with a card: still paid
    const paid = nextStep(prompt, status("paid", [payment("p2", "PAID", "Paynow"), payment("p1", "FAILED")]), 10_000, { failed: true, nudged: false });
    expect(paid).toEqual({ kind: "paid", payment: payment("p2", "PAID", "Paynow") });
    // Only a link was sent
    expect(nextStep({ paymentId: null, sentAt: 0 }, status("paid", [payment("p3", "PAID", "InnBucks")]), 10_000, none).kind).toBe("paid");
  });

  test("their prompt failed or was cancelled: told once", () => {
    expect(nextStep(prompt, status("open", [payment("p1", "FAILED")]), 10_000, none)).toEqual({ kind: "failed", payment: payment("p1", "FAILED") });
    expect(nextStep(prompt, status("open", [payment("p1", "CANCELLED")]), 10_000, none).kind).toBe("failed");
    // Already told: keep watching the link (they may pay on it)
    expect(nextStep(prompt, status("open", [payment("p1", "FAILED")]), 10_000, { failed: true, nudged: false }).kind).toBe("wait");
  });

  test("still waiting after 2 minutes: one nudge, within the watch only", () => {
    const pending = status("open", [payment("p1", "PENDING")]);
    expect(nextStep(prompt, pending, NUDGE_AFTER_MS - 1, none).kind).toBe("wait");
    expect(nextStep(prompt, pending, NUDGE_AFTER_MS, none).kind).toBe("nudge");
    expect(nextStep(prompt, pending, NUDGE_AFTER_MS + 30_000, { failed: false, nudged: true }).kind).toBe("wait");
    // Paynow never settled it and days went by: not brought up again
    expect(nextStep(prompt, pending, WATCH_MS + 1, none).kind).toBe("wait");
  });

  test("a link with no prompt of ours: no nudges or failures (the pay page shows those)", () => {
    const link = { paymentId: null, sentAt: 0 };
    expect(nextStep(link, status("open", [payment("x", "FAILED", "Paynow")]), NUDGE_AFTER_MS * 2, none).kind).toBe("wait");
    expect(nextStep(link, status("open", []), NUDGE_AFTER_MS * 2, none).kind).toBe("wait");
  });

  test("an expired link: stop watching", () => {
    expect(nextStep(prompt, status("expired", [payment("p1", "PENDING")]), 10_000, none).kind).toBe("stop");
  });
});

describe("wallets and messages", () => {
  test("EcoCash for 077 and 078, OneMoney for 071, none for the rest", () => {
    expect(walletFor("0771234567")).toBe("ecocash");
    expect(walletFor("+263 78 123 4567")).toBe("ecocash");
    expect(walletFor("263711234567")).toBe("onemoney");
    expect(walletFor("0731234567")).toBeNull();
    expect(walletFor("12345")).toBeNull();
  });

  test("numbers as people write them", () => {
    expect(localDigits("+263 77 123 4567")).toBe("0771234567");
    expect(localDigits("771234567")).toBe("0771234567");
    expect(localDigits("077-123-4567")).toBe("0771234567");
  });

  test("each payment message names the wallet or carries the link", () => {
    expect(promptSentMessage(3000, "0711234567", "onemoney")).toContain("OneMoney PIN");
    expect(promptSentMessage(3000, "0771234567")).toContain("EcoCash PIN");
    for (const message of [paymentFailedMessage(URL), promptNudgeMessage(URL), linkInsteadMessage(URL, 3000, "failed"), linkInsteadMessage(URL, 3000, "number")]) {
      expect(message).toContain(URL);
      expect(message.length).toBeLessThan(400);
    }
    expect(linkInsteadMessage(URL, 3000, "failed")).toContain("$30.00");
  });
});
