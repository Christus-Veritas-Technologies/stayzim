import { describe, expect, test } from "bun:test";

import { photoSrcSet, uploadUrl } from "./uploads";

// No R2 in tests (test/setup.ts): files are served by the API at /uploads
describe("photoSrcSet", () => {
  test("lists the small, medium and full photo with their widths", () => {
    const landscape = { key: "lodges/l1/p1.jpg", mediumKey: "lodges/l1/p1-md.jpg", smallKey: "lodges/l1/p1-sm.jpg", width: 1600, height: 1200 };
    expect(photoSrcSet(landscape)).toBe(
      "https://api.stayzim.co.zw/uploads/lodges/l1/p1-sm.jpg 640w, https://api.stayzim.co.zw/uploads/lodges/l1/p1-md.jpg 1280w, https://api.stayzim.co.zw/uploads/lodges/l1/p1.jpg 1600w",
    );
  });

  test("scales widths by the longest side, so portrait copies are narrower", () => {
    const portrait = { key: "p.jpg", mediumKey: "p-md.jpg", smallKey: "p-sm.jpg", width: 1200, height: 1600 };
    expect(photoSrcSet(portrait)).toBe(`${uploadUrl("p-sm.jpg")} 480w, ${uploadUrl("p-md.jpg")} 960w, ${uploadUrl("p.jpg")} 1200w`);
  });

  test("leaves out copies that don't exist, and is null without any", () => {
    const smallPhoto = { key: "s.jpg", mediumKey: null, smallKey: "s-sm.jpg", width: 900, height: 600 };
    expect(photoSrcSet(smallPhoto)).toBe(`${uploadUrl("s-sm.jpg")} 640w, ${uploadUrl("s.jpg")} 900w`);
    expect(photoSrcSet({ key: "old.jpg", mediumKey: null, smallKey: null, width: 1600, height: 1200 })).toBeNull();
  });
});
