import { describe, expect, test } from "bun:test";
import type { DirectoryLodge } from "@stayzim/sites";

import { byTown } from "./directory";

const lodge = (slug: string, town: string | null): DirectoryLodge => ({
  slug,
  customDomain: null,
  name: slug,
  town,
  region: null,
  setting: null,
  themeColor: "#1D5C7A",
  hero: null,
  priceFrom: null,
  updatedAt: "2026-10-08T00:00:00.000Z",
});

describe("byTown", () => {
  test("groups lodges by town, A to Z, with lodges without a town last", () => {
    const groups = byTown([lodge("a", "Nyanga"), lodge("b", null), lodge("c", "Kariba"), lodge("d", "Nyanga")]);
    expect(groups.map(([town, lodges]) => [town, lodges.map((entry) => entry.slug)])).toEqual([
      ["Kariba", ["c"]],
      ["Nyanga", ["a", "d"]],
      ["Other places", ["b"]],
    ]);
  });
});
