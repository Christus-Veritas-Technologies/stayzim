import { describe, expect, test } from "bun:test";

import { topRoomsFrom } from "../routes/stats";

describe("topRoomsFrom", () => {
  const rooms = [
    { id: "a", name: "River Suite" },
    { id: "b", name: "Garden Cottage" },
    { id: "c", name: "Family Chalet" },
  ];

  test("ranks rooms by booking taps, most first", () => {
    const taps = new Map([["a", 2], ["b", 5], ["c", 1]]);
    expect(topRoomsFrom(taps, rooms).map((room) => room.name)).toEqual(["Garden Cottage", "River Suite", "Family Chalet"]);
  });

  test("ties keep the room order; deleted rooms and rooms nobody asked about are left out", () => {
    const taps = new Map([["a", 3], ["c", 3], ["gone", 9]]);
    expect(topRoomsFrom(taps, rooms)).toEqual([
      { roomId: "a", name: "River Suite", count: 3 },
      { roomId: "c", name: "Family Chalet", count: 3 },
    ]);
  });
});
