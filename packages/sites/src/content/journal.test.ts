import { describe, expect, test } from "bun:test";

import { formatPostDate, postBlocks, readMinutes } from "./journal";
import { postInput, postSlug, reviewsInput } from "./schemas";

describe("postBlocks", () => {
  test("splits paragraphs on blank lines and reads ## as a heading", () => {
    expect(postBlocks("First line\nstill first.\r\n\r\n## Getting there\n\nTake the Mutare road.")).toEqual([
      { kind: "paragraph", text: "First line\nstill first." },
      { kind: "heading", text: "Getting there" },
      { kind: "paragraph", text: "Take the Mutare road." },
    ]);
  });

  test("keeps HTML as text", () => {
    expect(postBlocks("<script>alert(1)</script>")).toEqual([{ kind: "paragraph", text: "<script>alert(1)</script>" }]);
  });
});

describe("readMinutes", () => {
  test("is at least a minute, at 200 words a minute", () => {
    expect(readMinutes("short")).toBe(1);
    expect(readMinutes("word ".repeat(820))).toBe(4);
  });
});

test("formatPostDate", () => {
  expect(formatPostDate("2026-09-12")).toMatch(/^12 Sept? 2026$/);
});

describe("postSlug", () => {
  test("makes an address from the title", () => {
    expect(postSlug("A morning walk to Bridal Veil Falls!")).toBe("a-morning-walk-to-bridal-veil-falls");
    expect(postSlug("Café & braai — what to pack")).toBe("cafe-braai-what-to-pack");
  });
});

describe("reviewsInput", () => {
  test("takes a score with one decimal and an https listing", () => {
    const parsed = reviewsInput.parse({ score: 9.4, count: 128, source: "Booking.com", url: "https://www.booking.com/hotel/zw/x.html", quotes: [{ quote: "Lovely.", author: "Tendai M." }] });
    expect(parsed.quotes[0]).toEqual({ quote: "Lovely.", author: "Tendai M.", origin: null, stayed: null, score: null });
    expect(reviewsInput.safeParse({ score: 11, count: null, source: "Booking.com", quotes: [] }).success).toBe(false);
    expect(reviewsInput.safeParse({ score: 9.45, count: null, source: "Booking.com", quotes: [] }).success).toBe(false);
    expect(reviewsInput.safeParse({ score: null, count: null, source: "Booking.com", url: "http://x.com", quotes: [] }).success).toBe(false);
    expect(reviewsInput.parse({ score: null, count: null, source: "Booking.com", url: "", quotes: [] }).url).toBeNull();
  });
});

describe("postInput", () => {
  test("needs a title, a body and a real date", () => {
    expect(postInput.safeParse({ title: "Hi", body: "x", publishedOn: "2026-09-12" }).success).toBe(false);
    expect(postInput.safeParse({ title: "Where to eat", body: "x", publishedOn: "2026-02-30" }).success).toBe(false);
    expect(postInput.parse({ title: "Where to eat", body: "x", publishedOn: "2026-09-12" })).toMatchObject({ slug: "", excerpt: null, coverId: null });
  });
});
