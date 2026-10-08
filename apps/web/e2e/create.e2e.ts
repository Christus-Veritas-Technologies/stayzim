import { expect, test } from "@playwright/test";

import { lodgeSiteUrl } from "./env";

/** A small photo, so the test needs no files on disk. */
const PHOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAVElEQVR4nO3PQQ3AIADAQEANmhCB/+dE8Lgs6Slo575n/NnSAa8a0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQPtp2AVDWp0u0AAAAAElFTkSuQmCC", "base64");

/**
 * The path from an advert: /create with the ad's tags, a look, the lodge's
 * name and WhatsApp, a photo, and the site is live in that look with its demo
 * badges, before any email. Then Claim my site. Automated, the live site
 * comes well inside the 90 seconds a person has.
 */
test("a lodge goes live from an advert in four steps, then the owner claims it", async ({ page }) => {
  test.setTimeout(120_000);
  const started = Date.now();
  const stamp = Date.now().toString(36);

  await page.goto("/create?utm_source=meta&utm_campaign=registration_test");
  await expect(page.getByText(/Step 1 of 4/)).toBeVisible();
  await expect(page.getByRole("radio", { name: /Shoreline/ })).toHaveAttribute("aria-checked", "true");
  // Designs come in plan tabs, cheapest first
  await expect(page.getByRole("radio", { name: /Rondavel/ })).toHaveCount(0);
  await page.getByRole("tab", { name: /Starter/ }).click();
  await page.getByRole("radio", { name: /Rondavel/ }).click();
  await page.getByRole("button", { name: /Next: your place/ }).click();

  // The place: type, setting, rooms and price, for the copy and the example rooms
  await expect(page.getByText(/Step 2 of 4/)).toBeVisible();
  await page.getByRole("radio", { name: /Guesthouse/ }).click();
  await page.getByRole("radio", { name: /Mountains/ }).click();
  await page.getByRole("radio", { name: "$50" }).click();
  // Back keeps the look picked, then on again; the answers stay
  await page.getByRole("button", { name: "Back" }).first().click();
  await expect(page.getByRole("radio", { name: /Rondavel/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /Next: your place/ }).click();
  await expect(page.getByRole("radio", { name: /Guesthouse/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /Next: your lodge/ }).click();

  await expect(page.getByText(/Step 3 of 4/)).toBeVisible();
  await page.getByLabel("Lodge name").fill(`Farai Rest ${stamp}`);
  await page.getByLabel("Town or city").fill("Nyanga");
  await page.getByLabel("WhatsApp number").fill("077 444 5555");
  await page.getByRole("button", { name: /Next: add photos/ }).click();

  await expect(page.getByRole("heading", { name: "Add 3 photos" })).toBeVisible();
  await expect(page.getByText(/Step 4 of 4/)).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "lodge.png", mimeType: "image/png", buffer: PHOTO });
  await expect(page.getByText("Top", { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Go live/ }).click();

  await expect(page.getByRole("heading", { name: /is live/ })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(90_000);
  const slug = `farai-rest-${stamp}`;

  const guest = await page.context().newPage();
  await guest.goto(lodgeSiteUrl(slug));
  await expect(guest.getByText("Demo site.")).toBeVisible();
  await expect(guest.locator('a[href^="https://wa.me/"]').first()).toBeAttached();
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // A new site shows example rooms, marked, that can't be booked
  const example = guest.locator("#rooms [data-room-id^='sample-']");
  await expect(example).toHaveCount(4);
  await expect(example.first().getByText("Example", { exact: true })).toBeVisible();
  await example.first().getByRole("link", { name: /book/i }).click();
  await expect(guest.getByRole("dialog", { name: "This is an example room" })).toBeVisible();
  expect(guest.context().pages()).toHaveLength(2);
  await guest.getByRole("button", { name: "Got it" }).click();
  await guest.close();

  // Claim my site: an email and password for the guest account, and the site stays
  const email = `farai-${stamp}@signup.test`;
  await page.getByLabel("Your name").fill("Farai Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("farai-pass-123");
  await page.getByRole("button", { name: "Claim my site" }).click();
  await expect(page.getByText(`Log in with ${email} from now on`)).toBeVisible();

  // The site went live in the look picked first
  await page.goto("/dashboard/design");
  await expect(page.getByLabel("Starter templates").locator("div").filter({ hasText: /^Rondavel/ }).getByText("Live", { exact: true })).toBeVisible();

  await page.goto("/dashboard/billing");
  await expect(page.getByText("Your site is live as a free demo")).toBeVisible();
  await expect(page.getByText("Your site isn't saved to an email yet.")).toHaveCount(0);
});

test("old sign-up links land on /create, keeping the plan and the ad's tags", async ({ page }) => {
  await page.goto("/signup?plan=pro&utm_source=meta");
  await expect(page).toHaveURL(/\/create\?plan=pro&utm_source=meta/);
});

test("each design opens a preview on an example lodge, and Use picks it", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("radio", { name: /Wordmark/ }).hover();
  await page.getByRole("button", { name: "Preview Wordmark" }).click();
  const frame = page.frameLocator('iframe[title="Wordmark design preview"]');
  await expect(frame.getByText("Preview: Wordmark template")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Use Wordmark" }).click();
  await expect(page.getByRole("radio", { name: /Wordmark/ })).toHaveAttribute("aria-checked", "true");
  await expect(page).toHaveURL(/look=growth-wordmark/);
});
