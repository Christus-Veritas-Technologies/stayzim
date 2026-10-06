import { devices, expect, test, type Page } from "@playwright/test";

import { lodgeSiteUrl, OWNER_STATE } from "./env";

// The narrowest phones in common use in Zimbabwe are 360px wide
test.use({ ...devices["Galaxy S9+"], viewport: { width: 360, height: 740 } });

/** Elements that stick out past the right edge, for a readable failure. */
async function sideways(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= width) return [];
    return [...document.body.querySelectorAll("*")]
      .filter((element) => element.getBoundingClientRect().right > width + 1)
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 80)}`);
  });
}

async function scrollThrough(page: Page) {
  // Reveal animations start offset, so look at the page once everything has shown
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
  await page.waitForTimeout(500);
}

const publicPages = ["/", "/login", "/forgot-password", "/privacy", "/terms"];

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

  for (const path of ["/dashboard", "/dashboard/site", "/dashboard/rooms", "/dashboard/gallery", "/dashboard/design", "/dashboard/requests", "/dashboard/analytics", "/dashboard/billing"]) {
    test(`${path} fits a 360px phone`, async ({ page }) => {
      await page.goto(path);
      await scrollThrough(page);
      expect(await sideways(page)).toEqual([]);
    });
  }
});
