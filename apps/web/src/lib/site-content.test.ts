import { describe, expect, test } from "bun:test";

import { amenitySummary, countWords, emphasis, hasStayInfo, highlightWords, plainText, roomFacts, roomStats, scoreWord, splitIntro, stayFacts } from "./site-content";

describe("roomFacts", () => {
  test("lists what the owner filled in, in order", () => {
    expect(roomFacts({ sleeps: 4, beds: "1 queen + 2 singles", size: 32 })).toEqual(["Sleeps 4", "1 queen + 2 singles", "32 m²"]);
  });

  test("leaves out what's missing", () => {
    expect(roomFacts({ sleeps: 2, beds: null, size: null })).toEqual(["Sleeps 2"]);
    expect(roomFacts({ sleeps: 2, beds: null, size: 18 })).toEqual(["Sleeps 2", "18 m²"]);
  });
});

describe("stayFacts", () => {
  test("reads the times the owner set", () => {
    expect(stayFacts({ checkInFrom: "14:00", checkOutBy: "10:00" })).toBe("Check-in from 14:00 · Check-out by 10:00");
    expect(stayFacts({ checkInFrom: null, checkOutBy: "10:00" })).toBe("Check-out by 10:00");
    expect(stayFacts({ checkInFrom: null, checkOutBy: null })).toBeNull();
  });

  test("Good to know shows when anything is filled in", () => {
    expect(hasStayInfo({ checkInFrom: null, checkOutBy: null, houseRules: [], cancellationPolicy: null })).toBe(false);
    expect(hasStayInfo({ checkInFrom: null, checkOutBy: null, houseRules: ["No pets"], cancellationPolicy: null })).toBe(true);
  });
});

describe("emphasis", () => {
  test("splits starred words out", () => {
    expect(emphasis("A *quiet garden* stay")).toEqual([
      { text: "A ", em: false },
      { text: "quiet garden", em: true },
      { text: " stay", em: false },
    ]);
  });

  test("leaves text without stars, or with an unpaired star, as it is", () => {
    expect(emphasis("Mist Valley Lodge")).toEqual([{ text: "Mist Valley Lodge", em: false }]);
    expect(plainText("5* views")).toBe("5* views");
    expect(plainText("Wake up *above* the mountains")).toBe("Wake up above the mountains");
  });
});

describe("splitIntro", () => {
  test("uses a short first sentence as the heading", () => {
    expect(splitIntro("Wood fires and big breakfasts. Three rooms by the river.")).toEqual({
      heading: "Wood fires and big breakfasts",
      body: "Three rooms by the river.",
    });
  });

  test("keeps a long first sentence as the paragraph, and copes with nothing", () => {
    const long = `${"A very long sentence ".repeat(8)}ends here. Then more.`;
    expect(splitIntro(long)).toEqual({ heading: null, body: long });
    expect(splitIntro("  ")).toEqual({ heading: null, body: null });
    expect(splitIntro("Just one line")).toEqual({ heading: "Just one line", body: null });
  });
});

describe("amenitySummary", () => {
  test("counts each amenity once per room, most common first", () => {
    const rooms = [{ amenities: ["fireplace", "wifi"] }, { amenities: ["fireplace", "fireplace"] }] as Parameters<typeof amenitySummary>[0];
    expect(amenitySummary(rooms)).toEqual([
      { key: "fireplace", count: 2, where: "In all 2 rooms" },
      { key: "wifi", count: 1, where: "In 1 room" },
    ]);
  });
});

describe("roomStats", () => {
  test("is null without rooms", () => {
    expect(roomStats([])).toBeNull();
    expect(roomStats([{ price: 120, sleeps: 2 }, { price: 95, sleeps: 4 }])).toEqual({ count: 2, fewest: 2, most: 4, from: 95 });
  });
});

describe("highlightWords", () => {
  test("picks out the words wherever they are, ignoring case", () => {
    expect(highlightWords("Cabins with a private deck and Air con.", ["Air con", "Private deck"])).toEqual([
      { text: "Cabins with a ", em: false },
      { text: "private deck", em: true },
      { text: " and ", em: false },
      { text: "Air con", em: true },
      { text: ".", em: false },
    ]);
  });

  test("matches whole words only", () => {
    expect(highlightWords("Embraai", ["Braai"])).toEqual([{ text: "Embraai", em: false }]);
  });
});

describe("scoreWord and countWords", () => {
  test("read like Booking.com and a person", () => {
    expect([scoreWord(9.6), scoreWord(9.4), scoreWord(8.7), scoreWord(8.1), scoreWord(7.2), scoreWord(5)]).toEqual(["Exceptional", "Superb", "Fabulous", "Very good", "Good", "Rated"]);
    expect([countWords(4, "room"), countWords(1, "tent"), countWords(14, "room")]).toEqual(["Four rooms", "One tent", "14 rooms"]);
  });
});
