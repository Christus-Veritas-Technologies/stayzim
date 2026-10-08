import { describe, expect, test } from "bun:test";

import { indexNowUrls } from "./indexnow";

describe("indexNowUrls", () => {
  test("a Starter site is one page", () => {
    expect(indexNowUrls({ slug: "mistvalley", customDomain: "mistvalleylodge.co.zw", plan: "STARTER" })).toEqual(["https://mistvalleylodge.co.zw"]);
  });

  test("Pro sends every page but the room pages, on the lodge's own domain", () => {
    expect(indexNowUrls({ slug: "mistvalley", customDomain: "mistvalleylodge.co.zw", plan: "PRO" })).toEqual([
      "https://mistvalleylodge.co.zw",
      "https://mistvalleylodge.co.zw/rooms",
      "https://mistvalleylodge.co.zw/gallery",
      "https://mistvalleylodge.co.zw/contact",
      "https://mistvalleylodge.co.zw/about",
      "https://mistvalleylodge.co.zw/experiences",
      "https://mistvalleylodge.co.zw/reviews",
      "https://mistvalleylodge.co.zw/journal",
    ]);
  });
});
