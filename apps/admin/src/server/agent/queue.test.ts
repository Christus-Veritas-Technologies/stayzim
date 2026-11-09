import { describe, expect, test } from "bun:test";

import { harareDayStart } from "./limits";
import { GAP_MS, MAX_WAIT_MS, MEDIA_GAP_MS, scheduleTurn } from "./queue";

describe("scheduleTurn", () => {
  test("one message: its turn runs 5 s later", () => {
    expect(scheduleTurn(null, 1_000)).toEqual({ startedAt: 1_000, runAt: 1_000 + GAP_MS });
  });

  test("each message within the gap starts the 5 s again, from the same burst", () => {
    const first = scheduleTurn(null, 0);
    const second = scheduleTurn(first.startedAt, 4_000);
    const third = scheduleTurn(second.startedAt, 8_500);
    expect(second.runAt).toBe(4_000 + GAP_MS);
    expect(third).toEqual({ startedAt: 0, runAt: 8_500 + GAP_MS });
  });

  test("after a photo (an album arrives one by one), 10 s", () => {
    expect(scheduleTurn(null, 0, "image").runAt).toBe(MEDIA_GAP_MS);
    expect(scheduleTurn(null, 0, "ptt").runAt).toBe(MEDIA_GAP_MS);
    expect(scheduleTurn(null, 0, "chat").runAt).toBe(GAP_MS);
  });

  test("a burst never holds the answer more than 30 s from its first message", () => {
    let burst = scheduleTurn(null, 0);
    for (let at = 3_000; at <= 60_000; at += 3_000) burst = scheduleTurn(burst.startedAt, at);
    // Messages kept coming every 3 s: the turn is due at 30 s, not 65 s
    expect(scheduleTurn(burst.startedAt, 28_000).runAt).toBe(MAX_WAIT_MS);
    // Already past it: right away
    expect(scheduleTurn(0, 45_000).runAt).toBe(45_000);
  });
});

test("harareDayStart: midnight in Harare (UTC+2)", () => {
  // 21:30 UTC is 23:30 in Harare, still 9 November there
  expect(harareDayStart(new Date("2026-11-09T21:30:00Z")).toISOString()).toBe("2026-11-08T22:00:00.000Z");
  // 23:30 UTC is already 01:30 the next day in Harare
  expect(harareDayStart(new Date("2026-11-09T23:30:00Z")).toISOString()).toBe("2026-11-09T22:00:00.000Z");
});
