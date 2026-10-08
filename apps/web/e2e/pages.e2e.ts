import { expect, test } from "@playwright/test";

import { E2E, lodgeSiteUrl } from "./env";
import { scrollThrough, sideways } from "./layout";

/*
 * Pages per plan (packages/sites content/pages.ts): Starter is one page with
 * room filters on it; Growth adds Rooms, a page per room, Gallery and
 * Contact; Pro adds Our story, Things to do and Reviews. Each test lodge has
 * Garden Cottage and River Suite (sleep 2) and Family Chalet (sleeps 5).
 */

test("a Starter site is one page, with filters on its rooms", async ({ page }) => {
  const site = lodgeSiteUrl(E2E.starterLodge);
  for (const path of ["/rooms", "/gallery", "/contact", "/about"]) {
    expect((await page.goto(`${site}${path}`))?.status(), path).toBe(404);
  }
  await page.goto(site, { waitUntil: "networkidle" });
  const rooms = page.locator("#rooms [data-room-id]");
  await expect(rooms).toHaveCount(3);
  await page.locator("#rooms").getByLabel("Guests").selectOption("3");
  await expect(rooms.locator("visible=true")).toHaveCount(1);
  await expect(page.locator("#rooms").getByRole("status")).toContainText("Showing 1 of 3 rooms");
  await page.locator("#rooms").getByRole("button", { name: "Show all rooms" }).click();
  await expect(rooms.locator("visible=true")).toHaveCount(3);
});

test("a Growth site has Rooms, a page per room, Gallery and Contact, and no Pro pages", async ({ page }) => {
  const site = lodgeSiteUrl(E2E.lodge);
  await page.goto(`${site}/rooms`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cards = page.locator("[data-room-id]");
  await expect(cards).toHaveCount(3);
  await page.getByLabel("Sort rooms").selectOption("price-down");
  await expect(page.locator("[data-room-id]", { hasText: "Family Chalet" })).toHaveCSS("order", "0");

  // Links use the site's own address (its domain, when it has one), so check the path and open it here
  await expect(page.locator("[data-room-id]", { hasText: "Garden Cottage" }).getByRole("link", { name: "View room" })).toHaveAttribute("href", /\/rooms\/garden-cottage$/);
  await page.goto(`${site}/rooms/garden-cottage`);
  await expect(page.getByRole("heading", { level: 1, name: "Garden Cottage" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Other rooms" })).toBeVisible();

  for (const path of ["/gallery", "/contact"]) expect((await page.goto(`${site}${path}`))?.status(), path).toBe(200);
  for (const path of ["/about", "/experiences", "/reviews", "/rooms/no-such-room"]) expect((await page.goto(`${site}${path}`))?.status(), path).toBe(404);

  // The home page's nav goes to the pages
  await page.goto(site);
  await expect(page.locator('a[href$="/rooms"]').first()).toBeAttached();
});

test("a Pro site adds Our story, Things to do, Reviews and a compare table", async ({ page }) => {
  const site = lodgeSiteUrl(E2E.proLodge);
  for (const path of ["/about", "/experiences", "/reviews"]) {
    expect((await page.goto(`${site}${path}`))?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto(`${site}/rooms`);
  await expect(page.getByRole("table")).toContainText("Family Chalet");
});

test.describe("on a 360px phone", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const [lodge, path] of [
    [E2E.lodge, "/rooms"],
    [E2E.lodge, "/rooms/garden-cottage"],
    [E2E.lodge, "/gallery"],
    [E2E.lodge, "/contact"],
    [E2E.proLodge, "/rooms"],
    [E2E.proLodge, "/about"],
    [E2E.proLodge, "/experiences"],
    [E2E.proLodge, "/reviews"],
  ] as const) {
    test(`${lodge}${path} fits`, async ({ page }) => {
      await page.goto(`${lodgeSiteUrl(lodge)}${path}`);
      await scrollThrough(page);
      expect(await sideways(page)).toEqual([]);
    });
  }
});
