import { expect, test } from "@playwright/test";

import { E2E, lodgeSiteUrl, OWNER_STATE } from "./env";

/*
 * Search and sharing (docs/seo.md), and the dashboard pieces added with them:
 * field help, the draft preview, picking a design for a cheaper plan, the
 * visits card and the free-domain claim.
 */

test.describe("search and sharing", () => {
  test("StayZim's sitemap has /create, /lodges and the paid lodges", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`${E2E.baseURL}/create</loc>`);
    expect(sitemap).toContain(`${E2E.baseURL}/lodges</loc>`);
    expect(sitemap).not.toContain("/signup</loc>");
    expect(sitemap).toContain(`${lodgeSiteUrl(E2E.proLodge)}</loc>`);
  });

  test("/lodges lists paid lodges and no demos", async ({ page, request }) => {
    const listed: { slug: string; name: string }[] = await (await request.get(`${E2E.apiURL}/api/sites`)).json();
    expect(listed.map((lodge) => lodge.slug)).toContain(E2E.proLodge);
    for (const lodge of listed) {
      const site = await (await request.get(`${E2E.apiURL}/api/sites/${lodge.slug}`)).json();
      expect(site.demo, `${lodge.slug} is a demo`).toBeFalsy();
    }
    await page.goto("/lodges");
    await expect(page.getByRole("heading", { name: "Lodges on StayZim" })).toBeVisible();
    const pro = listed.find((lodge) => lodge.slug === E2E.proLodge)!;
    await expect(page.getByRole("link", { name: new RegExp(pro.name) })).toHaveAttribute("href", new RegExp(`^${lodgeSiteUrl(E2E.proLodge)}`));
  });

  test("a lodge page shares the lodge's own card", async ({ page, request }) => {
    await page.goto(lodgeSiteUrl(E2E.proLodge));
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toMatch(new RegExp(`/og/${E2E.proLodge}\\?v=`));
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Ridge View House");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const card = await request.get(image!);
    expect(card.status()).toBe(200);
    expect(card.headers()["content-type"]).toBe("image/png");
  });

  test("StayZim's pages share the brand card", async ({ page, request }) => {
    await page.goto("/");
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toBe(`${E2E.baseURL}/og`);
    expect((await request.get(image!)).headers()["content-type"]).toBe("image/png");
  });
});

test.describe("owner", () => {
  test.use({ storageState: OWNER_STATE });

  test("a '?' explains a field on hover", async ({ page }) => {
    await page.goto("/dashboard/design");
    await page.getByRole("button", { name: "More info" }).first().hover();
    await expect(page.getByText(/The big line guests read first/)).toBeVisible();
  });

  test("the hero preview shows a headline before it's saved", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/design");
    const headline = `Wake up in the *hills* ${Date.now() % 10_000}`;
    await page.getByLabel("Headline", { exact: true }).fill(headline);
    const preview = page.frameLocator('iframe[title="Preview of your site"]:not(.invisible)');
    await expect(preview.getByText(headline.replace(/\*/g, "")).first()).toBeVisible({ timeout: 20_000 });
  });

  test("moving to Starter asks for a Starter design before paying", async ({ page }) => {
    await page.goto("/dashboard/billing?plan=starter");
    const pay = page.getByRole("button", { name: /^Pay \$/ });
    // Without Paynow set up (CI), Billing says "Message us" instead of showing the pay card
    test.skip(!(await pay.isVisible().catch(() => false)) && (await page.getByText("Message us").first().isVisible()), "Paynow isn't set up here");
    const designs = page.getByRole("radiogroup", { name: "Pick a design for Starter" });
    await expect(designs).toBeVisible();
    await expect(pay).toBeDisabled();
    await designs.getByRole("radio").first().click();
    await expect(pay).toBeEnabled();
  });

  test("the visits card counts visits, guests and pages", async ({ page }) => {
    await page.goto("/dashboard/analytics");
    await expect(page.getByText(/\d+ guests? · \d+ pages? opened/)).toBeVisible();
  });

  test("a free domain with a name that can't be registered is refused", async ({ page }) => {
    await page.goto("/dashboard");
    const response = await page.evaluate(async (api) => {
      const result = await fetch(`${api}/api/lodge/domain-claim`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "ab" }),
      });
      return { status: result.status, body: await result.text() };
    }, E2E.apiURL);
    // 400 for the name on a paid lodge; 403 on a demo; 409 once a domain is claimed
    expect([400, 403, 409]).toContain(response.status);
  });
});
