import { describe, expect, test } from "bun:test";

import { lastTurnFrom, unanswered, whatsappText, withBatchLast, type Item } from "./batch";
import { daytimeInHarare } from "./follow-ups";

const at = (second: number) => new Date(Date.UTC(2026, 10, 9, 10, 0, second));
const them = (second: number, text: string): Item => ({ at: at(second), from: "them", text });
const us = (second: number, text: string): Item => ({ at: at(second), from: "us", text });
const texts = (items: Item[]) => items.map((item) => item.text);

describe("unanswered: which of their messages a turn answers", () => {
  test("everything after our last message", () => {
    const items = [them(0, "hi"), us(5, "Hi! What's your place called?"), them(10, "Hardy House"), them(12, "in Masvingo")];
    expect(texts(unanswered(items, null))).toEqual(["Hardy House", "in Masvingo"]);
    expect(texts(unanswered([them(0, "hi")], null))).toEqual(["hi"]);
  });

  test("a message that came in while a tool was sending (their sites) still gets an answer", () => {
    // The turn saw up to 10 s; at 14 s they wrote; make_sites sent the options at 20 s; the turn ended at 21 s
    const items = [them(10, "here are the photos"), them(14, "we also have a pool"), us(20, "Here's Hardy House's website in two versions…")];
    const lastTurn = lastTurnFrom({ kind: "turn", data: { upTo: at(10).toISOString() }, createdAt: at(21) });
    expect(texts(unanswered(items, lastTurn))).toEqual(["we also have a pool"]);
    // And not again once a later turn saw it
    const later = [...items, us(30, "Nice, a pool is worth showing.")];
    expect(unanswered(later, lastTurnFrom({ kind: "turn", data: { upTo: at(14).toISOString() }, createdAt: at(31) }))).toEqual([]);
  });

  test("a dropped reply: its whole batch again, even after a tool's message", () => {
    const items = [them(10, "how much is it?"), them(14, "and is it on Google?"), us(20, "Here's Hardy House's website…")];
    const lastTurn = lastTurnFrom({ kind: "superseded", data: { from: at(10).toISOString() }, createdAt: at(21) });
    expect(texts(unanswered(items, lastTurn))).toEqual(["how much is it?", "and is it on Google?"]);
  });

  test("turns logged before this change (no upTo) fall back to after our last message", () => {
    expect(lastTurnFrom({ kind: "turn", data: { tools: [] }, createdAt: at(0) })).toBeNull();
    expect(lastTurnFrom(null)).toBeNull();
  });

  test("the batch goes last, for the model to answer", () => {
    const items = [them(10, "a"), them(14, "b"), us(20, "options")];
    const batch = [items[1]!];
    expect(texts(withBatchLast(items, batch))).toEqual(["a", "options", "b"]);
  });
});

test("whatsappText: WhatsApp's one-mark bold and italics, no headings, plain links", () => {
  expect(whatsappText("It's **$15 a month**, __no contract__.")).toBe("It's *$15 a month*, _no contract_.");
  expect(whatsappText("## Options\nPick one")).toBe("Options\nPick one");
  expect(whatsappText("See [your site](https://hardy.stayzim.co.zw/)")).toBe("See your site: https://hardy.stayzim.co.zw/");
  expect(whatsappText("*already fine*")).toBe("*already fine*");
});

test("daytimeInHarare: 8:00 to 20:00 in Zimbabwe (UTC+2)", () => {
  expect(daytimeInHarare(new Date("2026-11-09T05:59:00Z"))).toBe(false); // 07:59
  expect(daytimeInHarare(new Date("2026-11-09T06:00:00Z"))).toBe(true); // 08:00
  expect(daytimeInHarare(new Date("2026-11-09T17:59:00Z"))).toBe(true); // 19:59
  expect(daytimeInHarare(new Date("2026-11-09T18:00:00Z"))).toBe(false); // 20:00
});
