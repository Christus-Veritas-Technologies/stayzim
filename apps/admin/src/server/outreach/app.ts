import { env } from "@stayzim/env/admin";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { agentRoutes } from "../agent/routes";
import { getAllAccountUsage, OutreachError } from "./outreach";
import { campaigns } from "./routes/campaigns";
import { contacts } from "./routes/contacts";
import { messages } from "./routes/messages";
import { replies } from "./routes/replies";
import { getStatuses } from "./whatsapp";

/** Where this server asks who's signed in: the API, inside Docker when it can. */
const SERVER_URL = (env.SERVER_INTERNAL_URL ?? env.NEXT_PUBLIC_SERVER_URL).replace(/\/$/, "");

/**
 * The team only: a signed-in team member (their StayZim session, checked with
 * the API), or a script with "Authorization: Bearer <ADMIN_API_TOKEN>".
 */
const requireTeam = createMiddleware(async (c, next) => {
  const authorization = c.req.header("authorization");
  if (authorization?.startsWith("Bearer ")) {
    if (env.ADMIN_API_TOKEN && authorization.slice(7) === env.ADMIN_API_TOKEN) return next();
    throw new HTTPException(401, { message: "Wrong token" });
  }
  const cookie = c.req.header("cookie");
  if (!cookie) throw new HTTPException(401, { message: "Sign in first" });
  const response = await fetch(`${SERVER_URL}/api/account/me`, { headers: { cookie } }).catch(() => null);
  if (!response?.ok) throw new HTTPException(401, { message: "Sign in first" });
  const me = (await response.json()) as { role?: string };
  if (me.role !== "ADMIN") throw new HTTPException(403, { message: "This is for the StayZim team" });
  return next();
});

/**
 * /api/outreach: the WhatsApp outreach, as the outreach app had it (now part of
 * the admin app). The engine itself is started by src/instrumentation.ts.
 */
export const outreachApp = new Hono()
  .basePath("/api/outreach")
  .use(requireTeam)
  // Large enough for a few thousand contacts in one POST /contacts
  .use(bodyLimit({ maxSize: 2 * 1024 * 1024 }))
  .get("/whatsapp/status", async (c) => {
    const usage = await getAllAccountUsage();
    return c.json(getStatuses().map((status) => ({ ...status, hasQr: Boolean(status.qrDataUrl), usage: usage.find((u) => u.account === status.account) })));
  })
  .route("/contacts", contacts)
  .route("/messages", messages)
  .route("/replies", replies)
  .route("/campaigns", campaigns)
  .route("/agent", agentRoutes)
  .notFound((c) => c.json({ error: "Not found" }, 404))
  .onError((err, c) => {
    if (err instanceof OutreachError) {
      if (err.retryAt) c.header("Retry-After", String(Math.max(1, Math.ceil((err.retryAt.getTime() - Date.now()) / 1000))));
      return c.json({ error: err.message, ...(err.retryAt && { retryAt: err.retryAt.toISOString() }) }, err.status);
    }
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error("[outreach]", err);
    return c.json({ error: "Internal server error" }, 500);
  });
