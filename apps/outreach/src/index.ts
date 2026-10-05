import prisma from "@stayzim/db";
import { env } from "@stayzim/env/outreach";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { bearerAuth } from "hono/bearer-auth";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { timing } from "hono/timing";
import { rateLimiter } from "hono-rate-limiter";

import { getAllAccountUsage, OutreachError } from "./outreach";
import { campaigns } from "./routes/campaigns";
import { contacts } from "./routes/contacts";
import { messages } from "./routes/messages";
import { replies } from "./routes/replies";
import { ui } from "./ui/pages";
import { getStatuses, startWhatsApp, stopWhatsApp } from "./whatsapp";

const app = new Hono();

app.use(requestId());
app.use(logger());
app.use(timing());
app.use(secureHeaders());
app.use(compress());
app.use(prettyJSON());
app.use(
  "/api/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

/**
 * Liveness for the container. Waiting for a QR scan is normal; only a failed
 * client is unhealthy, and only when every account has failed.
 */
app.get("/health", (c) => {
  const accounts = getStatuses().map(({ account, state }) => ({ account, state }));
  const healthy = accounts.some(({ state }) => state !== "failed");
  return c.json({ healthy, accounts }, healthy ? 200 : 503);
});

// ---------------------------------------------------------------------------
// JSON API: "Authorization: Bearer <OUTREACH_PASSWORD>"
// ---------------------------------------------------------------------------

const api = new Hono();

api.use(bearerAuth({ token: env.OUTREACH_PASSWORD }));
// Large enough for a few thousand contacts in one POST /api/contacts
api.use(bodyLimit({ maxSize: 2 * 1024 * 1024 }));
api.use(timeout(30_000));
api.use(
  rateLimiter({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-7",
    keyGenerator: (c) => c.req.header("authorization") ?? "anonymous",
  }),
);

api.get("/whatsapp/status", async (c) => {
  const usage = await getAllAccountUsage();
  return c.json(
    getStatuses().map(({ qrDataUrl, ...rest }) => ({
      ...rest,
      hasQr: Boolean(qrDataUrl),
      usage: usage.find((u) => u.account === rest.account),
    })),
  );
});
api.route("/contacts", contacts);
api.route("/messages", messages);
api.route("/replies", replies);
api.route("/campaigns", campaigns);

app.route("/api", api);

// ---------------------------------------------------------------------------
// Pages: Basic auth (user "admin", password OUTREACH_PASSWORD)
// ---------------------------------------------------------------------------

const pageAuth = basicAuth({ username: "admin", password: env.OUTREACH_PASSWORD });
for (const path of ["/", "/dashboard", "/accounts", "/contacts", "/contacts/*", "/campaign", "/campaign/*"]) {
  app.use(path, pageAuth);
}
// Browsers resend Basic credentials automatically, so form posts must come from our own pages
app.use("/contacts/*", csrf());
app.use("/campaign/*", csrf());
app.use("/contacts/*", bodyLimit({ maxSize: 2 * 1024 * 1024 }));

app.route("/", ui);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  if (err instanceof OutreachError) {
    if (err.retryAt) c.header("Retry-After", String(Math.max(1, Math.ceil((err.retryAt.getTime() - Date.now()) / 1000))));
    return c.json({ error: err.message, ...(err.retryAt && { retryAt: err.retryAt.toISOString() }) }, err.status);
  }
  if (err instanceof HTTPException) {
    // Auth failures keep their WWW-Authenticate headers
    if (err.status === 401) return err.getResponse();
    return c.json({ error: err.message }, err.status);
  }
  console.error(`[${c.get("requestId")}]`, err);
  return c.json({ error: "Internal server error", requestId: c.get("requestId") }, 500);
});

void startWhatsApp();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void stopWhatsApp()
      .then(() => prisma.$disconnect())
      .finally(() => process.exit(0));
  });
}

console.log(`[outreach] listening on http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
  // Bun closes idle connections after 10s by default; sends can take longer
  idleTimeout: 60,
};
