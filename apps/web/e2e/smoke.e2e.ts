import { expect, test } from "@playwright/test";

import { lodgeSiteUrl, OWNER_STATE } from "./env";

test("the landing page shows the plans and the example lodges", async ({ page }) => {
  await page.goto("/");
  const headline = page.getByRole("heading", { level: 1 });
  await expect(headline).toHaveText(/Get your lodge a website from \$(15|25) a month/);
  // Founding prices (until 22 October 2026, 23:59 Harare time): the countdown strip, and normal prices crossed out
  if ((await headline.textContent())?.includes("$15")) {
    await expect(page.getByRole("link", { name: /Founding prices end/ }).first()).toBeVisible();
    await expect(page.locator("#pricing").getByText("Normal price $25")).toBeAttached();
  } else {
    await expect(page.getByText(/Founding prices end/)).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: /Nyanga/ }).filter({ hasText: "mistvalley.stayzim.co.zw" })).toBeVisible();
  for (const plan of ["Starter", "Growth", "Pro"]) {
    await expect(page.getByRole("heading", { name: plan, exact: true }).first()).toBeAttached();
  }
});

test.describe("signed in", () => {
  test.use({ storageState: OWNER_STATE });

  test("the owner sees their rooms", async ({ page }) => {
    await page.goto("/dashboard/rooms");
    await expect(page.getByRole("heading", { level: 1, name: /^Rooms/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Garden Cottage/ })).toBeVisible();
  });
});

test("a lodge site lists its rooms with a Book on WhatsApp link for each", async ({ page }) => {
  await page.goto(lodgeSiteUrl());
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const book = page.locator('a[href^="https://wa.me/"]').filter({ hasText: /book/i });
  await expect(book.first()).toBeVisible();
  const room = await book.evaluateAll((links) =>
    links.map((link) => decodeURIComponent(new URL((link as HTMLAnchorElement).href).searchParams.get("text") ?? "")),
  );
  expect(room.some((text) => text.includes("the Garden Cottage"))).toBe(true);
});
