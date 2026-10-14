import { auth, onClaimLinkRedeemed } from "@stayzim/auth";
import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { isMailConfigured, verifyMailConnection } from "@stayzim/mail";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { onLeadSiteClaimed } from "./lib/admin";
import { withSession, type AuthVariables } from "./lib/session";
import { isAnyLodgeSiteOrigin } from "./lib/sites";
import { describeStorage, serveUpload } from "./lib/uploads";
import { account } from "./routes/account";
import { admin } from "./routes/admin";
import { adminConsole } from "./routes/admin-console";
import { adminLeads } from "./routes/admin-leads";
import { landing } from "./routes/landing";
import { lodge } from "./routes/lodge";
import { startBillingJob } from "./jobs/billing";
import { onboarding } from "./routes/onboarding";
import { pay } from "./routes/pay";
import { paynow } from "./routes/paynow";
import { sites } from "./routes/sites";

const app = new Hono<{ Variables: AuthVariables }>();

/** CORS_ORIGIN, plus WEB_URL's and ADMIN_URL's origins: the web and admin apps always reach the API. */
const WEB_ORIGINS = new Set([...env.CORS_ORIGIN, ...[env.WEB_URL, env.ADMIN_URL].flatMap((url) => (url ? [new URL(url).origin] : []))]);

app.use(logger());

// Lodge photos and logos, in development without R2 (see lib/uploads.ts). Before
// secureHeaders: they're public and shown on every lodge subdomain.
app.get("/uploads/*", async (c) => (await serveUpload(c.req.path)) ?? c.json({ error: "Not found" }, 404));
app.use(
  secureHeaders({
    // Lodge photos are shown on app. and {slug}.stayzim.co.zw, which share a site with api.
    crossOriginResourcePolicy: "same-site",
  }),
);
app.use(
  "/*",
  cors({
    // The web app's origins, and any lodge site, on its subdomain or its own domain (they report visits)
    origin: async (origin) => (WEB_ORIGINS.has(origin) || (await isAnyLodgeSiteOrigin(origin)) ? origin : null),
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    // The session cookie travels with requests from the web app
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

// For Docker and Coolify health checks: the API is up and can reach the database
app.get("/health", async (c) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out after 2s")), 2000);
  });
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return c.json({ status: "ok" });
  } catch (error) {
    console.error(`[health] database check failed: ${String(error).replace(/\s+/g, " ").trim()}`);
    return c.json({ status: "error", database: "unreachable" }, 503);
  } finally {
    clearTimeout(timer);
  }
});

// A lead opening the claim link for a site the team made for them (packages/auth's claim-link plugin)
onClaimLinkRedeemed(onLeadSiteClaimed);

// better-auth: sign in/out, session, password reset, claim links, ... (see packages/auth)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/landing", landing);

// Paynow tells us about payments here (no session: it's Paynow calling)
app.route("/api/paynow", paynow);
app.use("/api/onboarding/*", withSession);
app.route("/api/onboarding", onboarding);
app.use("/api/account/*", withSession);
app.route("/api/account", account);

app.route("/api/lodge", lodge);

// StayZim staff only: the admin app (apps/admin)
app.route("/api/admin", admin);
app.route("/api/admin", adminConsole);
app.route("/api/admin", adminLeads);

// Public: lodge site content and visit tracking
app.route("/api/sites", sites);

// Public: payment links (stayzim.co.zw/pay/…), made in the admin app
app.route("/api/pay", pay);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

console.log(`[uploads] Lodge photos are stored in ${describeStorage()}`);

// Invoices, reminders, overdue sites and old demos (src/jobs/billing.ts)
if (env.NODE_ENV !== "test") startBillingJob();

// Surface a broken SMTP setup at boot, not when an owner is waiting for a reset link
if (isMailConfigured()) {
  void verifyMailConnection().then((check) => {
    if (check.ok) console.log("[mail] SMTP connection OK (no-reply)");
    else console.error(`[mail] SMTP connection failed: ${check.error}`);
  });
  // Invoices, reminders and receipts, from billing@ when it has its own login
  void verifyMailConnection("billing").then((check) => {
    if (check.ok) console.log("[mail] Billing SMTP connection OK");
    else console.warn(`[mail] Billing SMTP: ${check.error}`);
  });
} else {
  console.warn("[mail] SMTP not configured; emails will be printed to the console");
}

export default {
  port: env.PORT,
  fetch: app.fetch,
};
