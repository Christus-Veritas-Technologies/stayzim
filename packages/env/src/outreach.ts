import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(9997),
    // Required on every /api request as "Authorization: Bearer <password>", and
    // as the password (user "admin") for the /whatsapp/qr pairing pages.
    OUTREACH_PASSWORD: z.string().min(12),
    // Contacts, the outreach log and WhatsApp sessions (via @stayzim/db).
    DATABASE_URL: z.string().min(1),
    // Scratch space for the live Chromium profiles and the zips RemoteAuth
    // backs up to Postgres. Safe to lose; Postgres is the source of truth.
    WHATSAPP_SESSION_PATH: z.string().min(1).default("./.wwebjs_auth"),
    // Chromium comes from the system/image rather than being downloaded by puppeteer.
    PUPPETEER_EXECUTABLE_PATH: z.string().min(1).optional(),
    // One WhatsApp number per id, each with its own browser + saved session.
    // Ids are RemoteAuth clientIds, so only letters, digits, _ and - are allowed.
    WHATSAPP_ACCOUNTS: z
      .string()
      .default("wa1,wa2,wa3")
      .transform((value) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))])
      .pipe(z.array(z.string().regex(/^[\w-]+$/)).min(1)),
    // Max messages each number may send in any rolling 24h window. 40 is a
    // conservative default for fresh/unwarmed numbers messaging people who don't
    // have them saved; raise gradually (e.g. +10/week) for numbers that have been
    // active for months, and stay well below ~200 even then.
    WHATSAPP_DAILY_LIMIT: z.coerce.number().int().min(1).default(40),
    // Lets the server boot without a browser, for tests and health checks.
    WHATSAPP_ENABLED: z
      .string()
      .default("true")
      .transform((value) => value !== "false"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
