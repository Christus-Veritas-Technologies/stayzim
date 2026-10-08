import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    // Web app origins allowed to call the API with cookies, comma-separated,
    // e.g. "https://stayzim.co.zw" (not the API's own address).
    // WEB_URL's origin is always allowed too.
    CORS_ORIGIN: z
      .string()
      .transform((value) => value.split(",").map((origin) => origin.trim().replace(/\/+$/, "")).filter(Boolean))
      .pipe(z.array(z.url()).min(1)),
    // Lodge sites live at {slug}.SITES_DOMAIN and may report visits to the API.
    // "stayzim.co.zw" in production; "localhost:9999" locally (mistvalley.localhost:9999).
    // A scheme or trailing slash is dropped ("https://stayzim.co.zw/" → "stayzim.co.zw").
    SITES_DOMAIN: z
      .string()
      .min(1)
      .default("stayzim.co.zw")
      .transform((value) => value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase()),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(9998),

    // Auth (packages/auth). Optional here so processes that load this env but never
    // mount auth (apps/outreach, via @stayzim/db) still boot; packages/auth checks them.
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    // Public URL of this API, e.g. https://api.stayzim.co.zw
    BETTER_AUTH_URL: z.url().optional(),
    // Public URL of the web app (login, reset password pages), e.g. https://stayzim.co.zw
    WEB_URL: z.url().optional(),
    // Share the session cookie across subdomains in production, e.g. ".stayzim.co.zw".
    // Leave unset on localhost.
    COOKIE_DOMAIN: z.string().min(1).optional(),
    // The request header holding the visitor's real IP, set by the proxy in front of the API.
    // Behind Cloudflare use "cf-connecting-ip": a visitor can't fake it, while the first
    // X-Forwarded-For entry can be. Used for sign-in rate limits and visit records.
    CLIENT_IP_HEADER: z
      .string()
      .min(1)
      .default("x-forwarded-for")
      .transform((value) => value.toLowerCase()),

    // Sign in with Google (packages/auth). Leave unset to hide the button. Signs in the
    // account with that Google email, or creates it (then /start).
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // Lodge photos and logos go to a Cloudflare R2 bucket (apps/server/src/lib/uploads.ts).
    // Leave these unset in development to save them in UPLOAD_DIR instead; production refuses to start without R2.
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    // Optional: the S3 endpoint, when it isn't https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
    // (buckets in R2's EU jurisdiction use https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com).
    // Any S3-compatible storage works too, e.g. a local MinIO for testing.
    R2_ENDPOINT: z
      .url()
      .optional()
      .transform((value) => value?.replace(/\/+$/, "")),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    // Public URL of the bucket (its custom domain or r2.dev URL), e.g. https://cdn.stayzim.co.zw
    R2_PUBLIC_URL: z
      .url()
      .optional()
      .transform((value) => value?.replace(/\/+$/, "")),
    // Development only, without R2: photos are saved here (relative to the server's working directory)
    UPLOAD_DIR: z.string().min(1).default("uploads"),

    // Email (packages/mail). Without SMTP_HOST, emails are printed to the console instead.
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    // e.g. "StayZim <no-reply@stayzim.co.zw>"; defaults to SMTP_USER. This main sender sends
    // password resets, welcome emails and booking notices. Replies go to hello@stayzim.co.zw.
    SMTP_FROM: z.string().min(1).optional(),
    // Invoices, payment reminders and receipts, from their own mailbox (billing@stayzim.co.zw).
    // Without BILLING_SMTP_USER they go from the main sender. Host and port default to SMTP_HOST and SMTP_PORT.
    BILLING_SMTP_HOST: z.string().min(1).optional(),
    BILLING_SMTP_PORT: z.coerce.number().int().positive().optional(),
    BILLING_SMTP_USER: z.string().min(1).optional(),
    BILLING_SMTP_PASS: z.string().min(1).optional(),
    // e.g. "StayZim Billing <billing@stayzim.co.zw>"; defaults to that, from BILLING_SMTP_USER
    BILLING_SMTP_FROM: z.string().min(1).optional(),

    // Paynow (apps/server/src/lib/paynow.ts): every payment goes through it
    // (EcoCash, InnBucks, OneMoney, cards). Without both, Billing says "Message
    // us", and StayZim records a payment made on Paynow with mark-paid.
    PAYNOW_INTEGRATION_ID: z.string().min(1).optional(),
    PAYNOW_INTEGRATION_KEY: z.string().min(1).optional(),
    // In Paynow's test mode, payments must use the merchant account's email.
    // Leave empty in live mode: the owner's email is sent.
    PAYNOW_AUTH_EMAIL: z.email().optional(),
    // Tests only: a stand-in for https://www.paynow.co.zw
    PAYNOW_API_URL: z.url().default("https://www.paynow.co.zw"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
