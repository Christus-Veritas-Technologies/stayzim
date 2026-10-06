import { auth } from "@stayzim/auth";
import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { isMailConfigured, verifyMailConnection } from "@stayzim/mail";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { withSession, type AuthVariables } from "./lib/session";
import { isLodgeSiteOrigin } from "./lib/sites";
import { describeStorage, serveUpload } from "./lib/uploads";
import { account } from "./routes/account";
import { admin } from "./routes/admin";
import { landing } from "./routes/landing";
import { lodge } from "./routes/lodge";
import { sites } from "./routes/sites";

const app = new Hono<{ Variables: AuthVariables }>();

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
    // The web app's origins, and any lodge site (they report visits)
    origin: (origin) => (env.CORS_ORIGIN.includes(origin) || isLodgeSiteOrigin(origin) ? origin : null),
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

// better-auth: sign in/out, session, password reset, ... (see packages/auth)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/landing", landing);

app.use("/api/account/*", withSession);
app.route("/api/account", account);

app.route("/api/lodge", lodge);

// StayZim staff only
app.route("/api/admin", admin);

// Public: lodge site content and visit tracking
app.route("/api/sites", sites);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

console.log(`[uploads] Lodge photos are stored in ${describeStorage()}`);

// Surface a broken SMTP setup at boot, not when an owner is waiting for a reset link
if (isMailConfigured()) {
  void verifyMailConnection().then((check) => {
    if (check.ok) console.log("[mail] SMTP connection OK");
    else console.error(`[mail] SMTP connection failed: ${check.error}`);
  });
} else {
  console.warn("[mail] SMTP not configured; emails will be printed to the console");
}

export default {
  port: env.PORT,
  fetch: app.fetch,
};
