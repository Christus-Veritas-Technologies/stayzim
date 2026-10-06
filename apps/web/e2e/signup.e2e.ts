import { expect, test } from "@playwright/test";

import { lodgeSiteUrl } from "./env";

/** A small photo, so the test needs no files on disk. */
const PHOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAVElEQVR4nO3PQQ3AIADAQEANmhCB/+dE8Lgs6Slo575n/NnSAa8a0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQPtp2AVDWp0u0AAAAAElFTkSuQmCC", "base64");

/**
 * The path from an advert: sign up, make the lodge, add a photo and rooms, and
 * the site is live with its demo badges. The real target is under 5 minutes
 * for a person; automated it must take well under 2.
 */
test("a new owner signs up and has a live demo site within minutes", async ({ page }) => {
  test.setTimeout(120_000);
  const started = Date.now();
  const stamp = Date.now().toString(36);

  await page.goto("/signup?plan=growth");
  await page.getByLabel("Your name").fill("Farai Test");
  await page.getByRole("textbox", { name: "Email" }).fill(`farai-${stamp}@signup.test`);
  await page.getByRole("textbox", { name: "Password" }).fill("farai-pass-123");
  await page.getByRole("button", { name: "Create my free demo" }).click();

  await expect(page).toHaveURL(/\/start/);
  await page.getByLabel("Lodge name").fill(`Farai Rest ${stamp}`);
  await page.getByLabel("Town").fill("Kariba");
  await page.getByLabel("WhatsApp number").fill("077 444 5555");
  await expect(page.getByText("It's yours")).toBeVisible();
  await page.getByRole("button", { name: "Create my site" }).click();

  await expect(page.getByRole("heading", { name: "Add some photos" })).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "lodge.png", mimeType: "image/png", buffer: PHOTO });
  await expect(page.getByText("Top photo")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Add your rooms" })).toBeVisible();
  await page.getByLabel("Name").first().fill("Lake Room");
  await page.getByLabel("Price a night").first().fill("70");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByRole("heading", { name: /is live/ })).toBeVisible();
  const slug = `farai-rest-${stamp}`;
  expect(Date.now() - started).toBeLessThan(120_000);

  await page.goto(lodgeSiteUrl(slug));
  await expect(page.getByText("Demo site.")).toBeVisible();
  await expect(page.locator('a[href^="https://wa.me/"]').filter({ hasText: /book/i }).first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.goto("/dashboard/billing");
  await expect(page.getByText("Your site is live as a free demo")).toBeVisible();
});
