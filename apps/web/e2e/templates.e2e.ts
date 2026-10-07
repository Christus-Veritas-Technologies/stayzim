import { TEMPLATE_KEYS } from "@stayzim/sites";
import { expect, test } from "@playwright/test";

import { E2E, lodgeSiteUrl, TEAM_STATE } from "./env";
import { scrollThrough, sideways } from "./layout";

/*
 * The nine designed templates (designs/StayZim Lodge Templates.html), the
 * enquiry bar on Growth and Pro designs, and the reviews and journal the
 * StayZim team keeps for Pro sites.
 */

const DAY = 86_400_000;
const dayFromNow = (days: number) => new Date(Date.now() + 2 * 3600_000 + days * DAY).toISOString().slice(0, 10);

test.describe("every template", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const key of TEMPLATE_KEYS) {
    test(`${key} shows the rooms and a way to book, and fits a 360px phone`, async ({ page }) => {
      await page.goto(`/preview/${E2E.lodge}/${key}`);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("#rooms")).toContainText("Garden Cottage");
      await expect(page.locator("#rooms").getByRole("link", { name: /book/i }).first()).toBeAttached();
      await expect(page.locator("#location")).toBeAttached();
      await scrollThrough(page);
      expect(await sideways(page)).toEqual([]);
    });
  }
});

test("the enquiry bar opens the booking sheet with the dates already picked", async ({ page }) => {
  const checkIn = dayFromNow(200 + Math.floor(Math.random() * 100));
  const checkOut = new Date(Date.parse(checkIn) + 2 * DAY).toISOString().slice(0, 10);
  // The bar is React: typing before it hydrates would be reset
  await page.goto(lodgeSiteUrl(), { waitUntil: "networkidle" });
  const bar = page.getByRole("form", { name: "Check your dates" });
  await bar.getByLabel("Arrive").fill(checkIn);
  await bar.getByLabel("Leave").fill(checkOut);
  await bar.getByRole("button", { name: "Check dates" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(`[data-date="${checkIn}"]`)).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.locator(`[data-date="${checkOut}"]`)).toHaveAttribute("aria-pressed", "true");
});

test.describe("Pro sites", () => {
  test.use({ storageState: TEAM_STATE });

  test("the team's reviews and journal post show on a Pro site", async ({ page }) => {
    const title = `A walk to the falls ${Date.now().toString(36)}`;
    await page.goto(`/admin/lodges/${E2E.proLodge}`);
    // Start from no quotes, so repeated runs stay under the limit
    const remove = page.getByRole("button", { name: /^Remove quote/ });
    while ((await remove.count()) > 0) await remove.first().click();
    await page.getByLabel("Score").first().fill("9.4");
    await page.getByLabel("Reviews").fill("128");
    await page.getByRole("button", { name: "Add a quote" }).click();
    await page.getByLabel("What they wrote").last().fill("Breakfast under the fig tree every morning.");
    await page.getByLabel("Name").last().fill("Rumbi K.");
    await page.getByRole("button", { name: "Save reviews" }).click();
    await expect(page.getByText("Reviews saved")).toBeVisible();

    await page.getByRole("tab", { name: /Journal/ }).click();
    await page.getByRole("button", { name: "New post" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Title").fill(title);
    await sheet.getByLabel("Post").fill("Leave after breakfast.\n\n## Getting there\n\nTen minutes down the hill.");
    await sheet.getByRole("button", { name: "Add post" }).click();
    await expect(page.getByText("Post added")).toBeVisible();

    const site = lodgeSiteUrl(E2E.proLodge);
    await page.goto(site);
    await expect(page.getByText("Breakfast under the fig tree every morning.")).toBeVisible();
    await page.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Getting there" })).toBeVisible();
  });
});
