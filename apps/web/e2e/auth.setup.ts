import { expect, test as setup } from "@playwright/test";

import { E2E, OWNER_STATE, TEAM_STATE } from "./env";

/**
 * Signs the owner in through the login form once and saves the session, so the
 * other tests start signed in. Sign-in is rate limited (5 per 10 minutes).
 */
setup("an owner signs in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E.email);
  await page.getByLabel("Password", { exact: true }).fill(E2E.password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL(/\/(dashboard|set-password)/);

  // A login made with create-owner starts on a temporary password
  if (page.url().includes("/set-password")) {
    await page.locator('input[name="password"]').fill(E2E.password);
    await page.locator('input[name="confirm"]').fill(E2E.password);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/dashboard/);
  }
  await expect(page.getByRole("navigation", { name: "Dashboard" }).first()).toBeAttached();
  await page.context().storageState({ path: OWNER_STATE });
});

/** The StayZim team account, for the team's screens (/admin). */
setup("the team signs in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E.teamEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL(/\/(dashboard|set-password|admin|start)/);
  if (page.url().includes("/set-password")) {
    await page.locator('input[name="password"]').fill(E2E.password);
    await page.locator('input[name="confirm"]').fill(E2E.password);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForURL(/\/(dashboard|admin|start)/);
  }
  await page.context().storageState({ path: TEAM_STATE });
});
