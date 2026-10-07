import { describe, expect, test } from "bun:test";

import { isOwnerVisitKey, ownerVisitKey } from "./owner-key";

describe("ownerVisitKey", () => {
  test("is the same for a lodge every time, and different per lodge", () => {
    expect(ownerVisitKey("lodge-a")).toBe(ownerVisitKey("lodge-a"));
    expect(ownerVisitKey("lodge-a")).not.toBe(ownerVisitKey("lodge-b"));
    expect(ownerVisitKey("lodge-a")).toMatch(/^[\w-]{32}$/);
  });

  test("only the lodge's own key passes", () => {
    expect(isOwnerVisitKey("lodge-a", ownerVisitKey("lodge-a"))).toBe(true);
    expect(isOwnerVisitKey("lodge-a", ownerVisitKey("lodge-b"))).toBe(false);
    expect(isOwnerVisitKey("lodge-a", "short")).toBe(false);
    expect(isOwnerVisitKey("lodge-a", undefined)).toBe(false);
  });
});
