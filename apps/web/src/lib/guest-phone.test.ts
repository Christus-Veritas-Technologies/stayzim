import { describe, expect, test } from "bun:test";

import { guestPhone } from "./guest-phone";

describe("guestPhone", () => {
  test("Zimbabwean numbers typed the local way get +263", () => {
    expect(guestPhone("077 123 4567")).toEqual({ digits: "263771234567" });
    expect(guestPhone("77 123 4567")).toEqual({ digits: "263771234567" });
    expect(guestPhone("+263 077 123 4567")).toEqual({ digits: "263771234567" });
  });

  test("other countries keep their code", () => {
    expect(guestPhone("+44 7700 900123")).toEqual({ digits: "447700900123" });
    expect(guestPhone("0027 82 123 4567")).toEqual({ digits: "27821234567" });
  });

  test("too short is an error", () => {
    expect("error" in guestPhone("1234")).toBe(true);
  });
});
