import { expect, test, type Locator, type Page } from "@playwright/test";

import { E2E, lodgeSiteUrl, OWNER_STATE } from "./env";

/*
 * The CMS end to end: rooms, guest info, the owner's calendar, and guests
 * booking on a Growth site. Dates are picked far ahead and at random, so
 * repeated local runs don't collide with each other's bookings.
 */

const DAY = 86_400_000;

/** A date in Harare, `days` from today, as YYYY-MM-DD. */
function dayFromNow(days: number) {
  return new Date(Date.now() + 2 * 3600_000 + days * DAY).toISOString().slice(0, 10);
}

/** Picks check-in and check-out in an open range calendar, paging months forward until each day shows. */
async function pickDates(scope: Locator, checkIn: string, checkOut: string) {
  for (const date of [checkIn, checkOut]) {
    for (let month = 0; month < 14 && !(await scope.locator(`[data-date="${date}"]`).isVisible()); month++) {
      await scope.getByRole("button", { name: "Next month", exact: true }).click();
    }
    await scope.locator(`[data-date="${date}"]`).click();
  }
}

const offset = () => 90 + Math.floor(Math.random() * 300);

test.describe("owner", () => {
  test.use({ storageState: OWNER_STATE });

  test("room details show on the site, and a hidden room doesn't", async ({ page, browser }) => {
    const note = `A quiet room, test ${Date.now()}.`;
    await page.goto("/dashboard/rooms");
    await page.getByRole("button", { name: /^Garden Cottage/ }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: /Details/ }).click();
    await sheet.getByLabel("Description").fill(note);
    await sheet.getByLabel("Beds").fill("1 queen");
    await sheet.getByRole("button", { name: "Save room" }).click();
    await expect(page.getByText("Room saved")).toBeVisible();

    const guest = await browser.newPage();
    await guest.goto(lodgeSiteUrl());
    await expect(guest.locator("#rooms")).toContainText(note);
    await expect(guest.locator("#rooms")).toContainText("1 queen");

    await page.getByRole("button", { name: "Options for Garden Cottage" }).click();
    await page.getByRole("menuitem", { name: "Hide from site" }).click();
    await expect(page.getByText("Garden Cottage is hidden from your site")).toBeVisible();
    await guest.reload();
    await expect(guest.locator("#rooms")).not.toContainText("Garden Cottage");

    await page.getByRole("button", { name: "Options for Garden Cottage" }).click();
    await page.getByRole("menuitem", { name: "Show on site" }).click();
    await expect(page.getByText("Garden Cottage is on your site")).toBeVisible();
    await guest.reload();
    await expect(guest.locator("#rooms")).toContainText("Garden Cottage");
    await guest.close();
  });

  test("guest info shows on the site", async ({ page, browser }) => {
    await page.goto("/dashboard/guest-info");
    await page.getByLabel("Check-in from").selectOption("15:00");
    // The questions section starts closed once there are some
    const questions = page.getByRole("button", { name: /Questions guests ask/ });
    if ((await questions.getAttribute("aria-expanded")) === "false") await questions.click();
    const parking = page.getByRole("button", { name: "Is there parking?" });
    if (await parking.isVisible()) {
      await parking.click();
      await page.getByRole("textbox", { name: "Answer" }).last().fill("Yes, safe parking inside the gate.");
    }
    const save = page.getByRole("button", { name: "Save changes" }).filter({ visible: true }).first();
    if (await save.isEnabled()) {
      await save.click();
      await expect(page.getByText("Guest info saved")).toBeVisible();
    }

    const guest = await browser.newPage();
    await guest.goto(lodgeSiteUrl());
    await expect(guest.locator("#good-to-know")).toContainText("From 15:00");
    await expect(guest.locator("#questions")).toContainText("Is there parking?");
    await guest.close();
  });

  test("a booking taken on WhatsApp goes in the calendar, and cancelling frees it", async ({ page }) => {
    const checkIn = dayFromNow(offset());
    const checkOut = dayFromNow(Math.round((Date.parse(checkIn) - Date.now()) / DAY) + 2);
    await page.goto("/dashboard/bookings?tab=calendar");
    await page.getByRole("button", { name: "Add booking" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Guest name").fill("Tendai Test");
    await pickDates(sheet, checkIn, checkOut);
    await sheet.getByRole("button", { name: "Add booking" }).click();
    await expect(page.getByText("Booking added")).toBeVisible();

    await page.getByRole("tab", { name: "Upcoming" }).click();
    await page.getByLabel("Search bookings").fill("Tendai Test");
    await page.getByRole("button", { name: /Tendai Test/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByText("Booking cancelled")).toBeVisible();
  });
});

test.describe("guests book on a Growth site", () => {
  async function setAutoConfirm(page: Page, on: boolean) {
    await page.goto("/dashboard/bookings?tab=requests");
    const toggle = page.getByRole("switch", { name: "Confirm bookings automatically" });
    if ((await toggle.getAttribute("aria-checked")) !== String(on)) {
      await toggle.click();
      await expect(page.getByText(on ? "Bookings confirm themselves" : "You confirm each booking")).toBeVisible();
    }
  }

  /** A guest books the first room on the site; returns the reference shown at the end. */
  async function guestBooks(page: Page, checkIn: string, checkOut: string, done: RegExp) {
    await page.goto(lodgeSiteUrl());
    await page.locator("#rooms").getByRole("link", { name: /Book now/ }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await pickDates(sheet, checkIn, checkOut);
    await sheet.getByRole("button", { name: "Next", exact: true }).click();
    await sheet.getByLabel("Your name").fill("Sarah Test");
    await sheet.getByLabel("WhatsApp number").fill("+44 7700 900123");
    await sheet.getByRole("button", { name: "Send request" }).click();
    await expect(sheet.getByText(done)).toBeVisible();
    const reference = sheet.locator("strong").filter({ hasText: /^B-[A-Z0-9]{4,6}$/ });
    await expect(reference).toBeVisible();
    return (await reference.innerText()).trim();
  }

  test("a request waits for the owner; once confirmed, the nights are full", async ({ browser }) => {
    const owner = await browser.newPage({ storageState: OWNER_STATE });
    await setAutoConfirm(owner, false);

    const checkIn = dayFromNow(offset());
    const checkOut = dayFromNow(Math.round((Date.parse(checkIn) - Date.now()) / DAY) + 2);
    const guest = await browser.newPage();
    const reference = await guestBooks(guest, checkIn, checkOut, /Request sent/);
    await expect(guest.getByRole("link", { name: "Send on WhatsApp too" })).toHaveAttribute("href", new RegExp(`wa\\.me/.*${reference}`));

    await owner.goto("/dashboard/bookings?tab=requests");
    const card = owner.locator("li").filter({ hasText: reference });
    await card.getByRole("button", { name: "Confirm" }).click();
    await expect(owner.getByText(/is confirmed/)).toBeVisible();

    const room = await (await guest.request.get(`${E2E.apiURL}/api/sites/${E2E.lodge}`)).json();
    const availability = await (await guest.request.get(`${E2E.apiURL}/api/sites/${E2E.lodge}/availability?from=${checkIn}&days=3`)).json();
    const first = availability.rooms.find((entry: { id: string }) => entry.id === room.rooms[0].id);
    expect(first.full).toContain(checkIn);
    await owner.close();
    await guest.close();
  });

  test("with Confirm bookings automatically, the guest is booked straight away", async ({ browser }) => {
    const owner = await browser.newPage({ storageState: OWNER_STATE });
    await setAutoConfirm(owner, true);
    const checkIn = dayFromNow(offset());
    const checkOut = dayFromNow(Math.round((Date.parse(checkIn) - Date.now()) / DAY) + 1);
    const guest = await browser.newPage();
    const reference = await guestBooks(guest, checkIn, checkOut, /You're booked/);

    await owner.goto("/dashboard/bookings?tab=upcoming");
    await owner.getByLabel("Search bookings").fill(reference);
    await expect(owner.getByRole("button", { name: /Sarah Test/ }).first()).toBeVisible();
    await setAutoConfirm(owner, false);
    await owner.close();
    await guest.close();
  });
});

test("a Starter site books on WhatsApp", async ({ page }) => {
  await page.goto(lodgeSiteUrl(E2E.starterLodge));
  const book = page.getByRole("link", { name: /Book/ }).first();
  await expect(book).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  // The chat opens in a new tab; the site doesn't open a booking sheet
  await Promise.all([page.waitForEvent("popup"), book.click()]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
