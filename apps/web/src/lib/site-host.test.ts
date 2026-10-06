import { describe, expect, test } from "bun:test";

import { lodgeSlugFromHost, MAIN_URL, siteHost, siteUrl } from "./site-host";

// NEXT_PUBLIC_SITES_DOMAIN is stayzim.co.zw in tests (test/setup.ts)
describe("lodge site addresses", () => {
  test("are https subdomains of the sites domain", () => {
    expect(siteHost({ slug: "mistvalley" })).toBe("mistvalley.stayzim.co.zw");
    expect(siteUrl({ slug: "mistvalley" })).toBe("https://mistvalley.stayzim.co.zw");
    expect(MAIN_URL).toBe("https://stayzim.co.zw");
  });
});

describe("lodgeSlugFromHost", () => {
  test("finds the lodge in a site's host, in any case", () => {
    expect(lodgeSlugFromHost("mistvalley.stayzim.co.zw")).toBe("mistvalley");
    expect(lodgeSlugFromHost("Lakeview.StayZim.co.zw")).toBe("lakeview");
  });

  test("leaves StayZim's own hosts and anything else alone", () => {
    for (const host of ["stayzim.co.zw", "app.stayzim.co.zw", "www.stayzim.co.zw", "a.b.stayzim.co.zw", "-x.stayzim.co.zw", "mistvalley.example.com", null]) {
      expect(lodgeSlugFromHost(host)).toBeNull();
    }
  });
});
