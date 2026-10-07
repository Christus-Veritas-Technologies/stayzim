import { devices, expect, test } from "@playwright/test";

import { lodgeSiteUrl, OWNER_STATE } from "./env";
import { scrollThrough, sideways } from "./layout";

// The narrowest phones in common use in Zimbabwe are 360px wide
test.use({ ...devices["Galaxy S9+"], viewport: { width: 360, height: 740 } });

const publicPages = ["/", "/create", "/login", "/forgot-password", "/privacy", "/terms"];

for (const path of publicPages) {
  test(`${path} fits a 360px phone`, async ({ page }) => {
    await page.goto(path);
    await scrollThrough(page);
    expect(await sideways(page)).toEqual([]);
  });
}

test("a lodge site fits a 360px phone", async ({ page }) => {
  await page.goto(lodgeSiteUrl());
  await scrollThrough(page);
  expect(await sideways(page)).toEqual([]);
});

test.describe("dashboard", () => {
  test.use({ storageState: OWNER_STATE });

  for (const path of [
    "/dashboard",
    "/dashboard/bookings",
    "/dashboard/bookings?tab=calendar",
    "/dashboard/site",
    "/dashboard/rooms",
    "/dashboard/gallery",
    "/dashboard/guest-info",
    "/dashboard/design",
    "/dashboard/requests",
    "/dashboard/analytics",
    "/dashboard/billing",
  ]) {
    test(`${path} fits a 360px phone`, async ({ page }) => {
      await page.goto(path);
      await scrollThrough(page);
      expect(await sideways(page)).toEqual([]);
    });
  }
});
