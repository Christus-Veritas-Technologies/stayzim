import { describe, expect, test } from "bun:test";

import { describeDevice, isLodgeSiteOrigin, lodgeSlugFromOrigin } from "./sites";

// SITES_DOMAIN is stayzim.co.zw in tests (test/setup.ts)
describe("lodgeSlugFromOrigin", () => {
  test("reads the lodge from its site's origin", () => {
    expect(lodgeSlugFromOrigin("https://mistvalley.stayzim.co.zw")).toBe("mistvalley");
    expect(lodgeSlugFromOrigin("https://Msasa-Ridge.stayzim.co.zw")).toBe("msasa-ridge");
  });

  test("ignores StayZim's own subdomains and other sites", () => {
    for (const origin of [
      "https://app.stayzim.co.zw",
      "https://api.stayzim.co.zw",
      "https://stayzim.co.zw",
      "https://mistvalley.stayzim.co.zw.evil.com",
      "https://evilstayzim.co.zw",
      "https://a.b.stayzim.co.zw",
      null,
      undefined,
    ]) {
      expect(lodgeSlugFromOrigin(origin)).toBeNull();
    }
  });

  test("backs isLodgeSiteOrigin, which CORS uses", () => {
    expect(isLodgeSiteOrigin("https://lakeview.stayzim.co.zw")).toBe(true);
    expect(isLodgeSiteOrigin("https://www.stayzim.co.zw")).toBe(false);
  });
});

describe("describeDevice", () => {
  test("tells phones, tablets and computers apart", () => {
    const android = "Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    const tablet = "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
    const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0";
    expect(describeDevice(android)).toEqual({ device: "PHONE", browser: "Android, Chrome" });
    expect(describeDevice(iphone)).toEqual({ device: "PHONE", browser: "iPhone, Safari" });
    expect(describeDevice(tablet)).toEqual({ device: "TABLET", browser: "Android, Chrome" });
    expect(describeDevice(windows)).toEqual({ device: "COMPUTER", browser: "Windows, Edge" });
  });

  test("copes without a user agent", () => {
    expect(describeDevice(undefined)).toEqual({ device: "COMPUTER", browser: null });
  });
});
