import { auth } from "@stayzim/auth";
import { env } from "@stayzim/env/server";
import { isMailConfigured, verifyMailConnection } from "@stayzim/mail";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { withSession, type AuthVariables } from "./lib/session";
import { describeStorage, serveUpload } from "./lib/uploads";
import { account } from "./routes/account";
import { landing } from "./routes/landing";
import { lodge } from "./routes/lodge";

const app = new Hono<{ Variables: AuthVariables }>();

app.use(logger());
app.use(
  secureHeaders({
    // Lodge photos are shown on app. and {slug}.stayzim.co.zw, which share a site with api.
    crossOriginResourcePolicy: "same-site",
  }),
);
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    // The session cookie travels with requests from the web app
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

// Lodge photos and logos, in development without R2 (see lib/uploads.ts)
app.get("/uploads/*", async (c) => (await serveUpload(c.req.path)) ?? c.json({ error: "Not found" }, 404));

// better-auth: sign in/out, session, password reset, ... (see packages/auth)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api/landing", landing);

app.use("/api/account/*", withSession);
app.route("/api/account", account);

app.route("/api/lodge", lodge);

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
