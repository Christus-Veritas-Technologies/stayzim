import { describe, expect, test } from "bun:test";

import { VISIT_GAP_MS, visitAround, visitStarts } from "./visits";

const minutes = (value: number) => new Date(Date.UTC(2026, 9, 6, 8, 0) + value * 60_000);
const events = [
  { id: "a", createdAt: minutes(0) },
  { id: "b", createdAt: minutes(10) },
  { id: "c", createdAt: minutes(35) },
  // More than 30 minutes later: a new visit
  { id: "d", createdAt: minutes(120) },
  { id: "e", createdAt: minutes(125) },
];

describe("visitAround", () => {
  test("chains events while the gaps stay within 30 minutes", () => {
    expect(visitAround(events, "b").map((event) => event.id)).toEqual(["a", "b", "c"]);
  });

  test("works from either end of a visit", () => {
    expect(visitAround(events, "a").map((event) => event.id)).toEqual(["a", "b", "c"]);
    expect(visitAround(events, "e").map((event) => event.id)).toEqual(["d", "e"]);
  });

  test("counts a gap of exactly 30 minutes as the same visit", () => {
    const edge = [
      { id: "x", createdAt: minutes(0) },
      { id: "y", createdAt: new Date(minutes(0).getTime() + VISIT_GAP_MS) },
    ];
    expect(visitAround(edge, "x")).toHaveLength(2);
  });

  test("is empty when the event isn't there", () => {
    expect(visitAround(events, "missing")).toEqual([]);
  });
});

describe("visitStarts", () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 8, 8, 0) + minutes * 60_000);
  const view = (id: string, visitorId: string, minutes: number) => ({ id, visitorId, createdAt: at(minutes) });

  test("one guest reading several pages is one visit", () => {
    const starts = visitStarts([view("a", "g1", 0), view("b", "g1", 2), view("c", "g1", 9)]);
    expect(starts.map((start) => start.id)).toEqual(["a"]);
  });

  test("a new visit after 30 minutes without a page, and each guest separately", () => {
    const starts = visitStarts([view("c", "g1", 45), view("a", "g1", 0), view("b", "g2", 1), view("d", "g1", 50)]);
    expect(starts.map((start) => start.id)).toEqual(["a", "b", "c"]);
  });
});
