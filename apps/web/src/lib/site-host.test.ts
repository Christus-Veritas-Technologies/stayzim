import { describe, expect, test } from "bun:test";

import { isStayZimHost, lodgeSlugFromHost, MAIN_URL, siteHost, siteUrl, subdomainHost } from "./site-host";

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
    for (const host of ["stayzim.co.zw", "app.stayzim.co.zw", "www.stayzim.co.zw", "sites.stayzim.co.zw", "a.b.stayzim.co.zw", "-x.stayzim.co.zw", "mistvalley.example.com", null]) {
      expect(lodgeSlugFromHost(host)).toBeNull();
    }
  });
});

describe("custom domains", () => {
  test("become the lodge's address when set", () => {
    expect(siteHost({ slug: "mistvalley", customDomain: "mistvalleylodge.co.zw" })).toBe("mistvalleylodge.co.zw");
    expect(siteUrl({ slug: "mistvalley", customDomain: "mistvalleylodge.co.zw" })).toBe("https://mistvalleylodge.co.zw");
    expect(siteUrl({ slug: "mistvalley", customDomain: null })).toBe("https://mistvalley.stayzim.co.zw");
    expect(subdomainHost({ slug: "mistvalley" })).toBe("mistvalley.stayzim.co.zw");
  });

  test("are told apart from StayZim's own and internal hosts", () => {
    for (const host of ["stayzim.co.zw", "app.stayzim.co.zw", "mistvalley.stayzim.co.zw", "localhost:9999", "web:9999", "10.0.0.4", "[::1]:9999", null]) {
      expect(isStayZimHost(host)).toBe(true);
    }
    for (const host of ["mistvalleylodge.co.zw", "www.mistvalleylodge.co.zw", "lodge.example.com:443"]) {
      expect(isStayZimHost(host)).toBe(false);
    }
  });
});
