import { describe, expect, test } from "bun:test";

import { roomFacts } from "./site-content";

describe("roomFacts", () => {
  test("lists what the owner filled in, in order", () => {
    expect(roomFacts({ sleeps: 4, beds: "1 queen + 2 singles", size: 32 })).toEqual(["Sleeps 4", "1 queen + 2 singles", "32 m²"]);
  });

  test("leaves out what's missing", () => {
    expect(roomFacts({ sleeps: 2, beds: null, size: null })).toEqual(["Sleeps 2"]);
    expect(roomFacts({ sleeps: 2, beds: null, size: 18 })).toEqual(["Sleeps 2", "18 m²"]);
  });
});
