import { expect, test } from "@playwright/test";

import { lodgeSiteUrl, OWNER_STATE } from "./env";

test("the landing page shows the plans and the demo lodges", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
