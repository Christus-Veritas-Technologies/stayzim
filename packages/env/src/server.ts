import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(9998),

    // Auth (packages/auth). Optional here so processes that load this env but never
    // mount auth (apps/outreach, via @stayzim/db) still boot; packages/auth checks them.
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    // Public URL of this API, e.g. https://api.stayzim.co.zw
    BETTER_AUTH_URL: z.url().optional(),
    // Public URL of the web app (login, reset password pages), e.g. https://app.stayzim.co.zw
    WEB_URL: z.url().optional(),
    // Share the session cookie across subdomains in production, e.g. ".stayzim.co.zw".
    // Leave unset on localhost.
    COOKIE_DOMAIN: z.string().min(1).optional(),

    // Where lodge photos and logos are saved (apps/server). Relative paths are from the
    // server's working directory. In Docker, mount a volume here so photos survive redeploys.
    UPLOAD_DIR: z.string().min(1).default("uploads"),

    // Email (packages/mail). Without SMTP_HOST, emails are printed to the console instead.
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    // e.g. "StayZim <hello@stayzim.co.zw>"; defaults to SMTP_USER
    SMTP_FROM: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
