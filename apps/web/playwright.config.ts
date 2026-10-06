import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests against running apps (web on 9999, API on 9998), started
 * separately: `pnpm dev`, or the production builds in CI. Files end in .e2e.ts
 * so `bun test` (unit tests) leaves them alone. See e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  // Sign-in is rate limited (5 per 10 minutes per IP), so tests sign in once and share it
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:9999",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
