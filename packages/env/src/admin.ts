import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * The admin app (apps/admin): its pages call the API like the web app does, and
 * its own server runs the WhatsApp outreach (one Chromium per number), reading
 * and writing the main database through @stayzim/db.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // The main database: lodges, leads, the outreach log and the WhatsApp sessions
    DATABASE_URL: z.string().min(1),
    // How this server reaches the API to check who's signed in (http://server:9998 in
    // Docker). Defaults to NEXT_PUBLIC_SERVER_URL.
    SERVER_INTERNAL_URL: z.url().optional(),
    // For scripts (and Claude) calling /api/outreach/* without a browser:
    // "Authorization: Bearer <ADMIN_API_TOKEN>". Unset: only signed-in team members.
    ADMIN_API_TOKEN: z.string().min(12).optional(),
    // Scratch space for the live Chromium profiles and the zips RemoteAuth backs up to
    // Postgres. Safe to lose; Postgres is the source of truth.
    WHATSAPP_SESSION_PATH: z.string().min(1).default("./.wwebjs_auth"),
    // Chromium comes from the system/image rather than being downloaded by puppeteer
    PUPPETEER_EXECUTABLE_PATH: z.string().min(1).optional(),
    // One WhatsApp number per id, each with its own browser and saved session.
    // Ids are RemoteAuth clientIds, so only letters, digits, _ and - are allowed.
    WHATSAPP_ACCOUNTS: z
      .string()
      .default("wa1,wa2,wa3")
      .transform((value) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))])
      .pipe(z.array(z.string().regex(/^[\w-]+$/)).min(1)),
    // Most messages each number may send in any rolling 24 hours. 40 is careful for new
    // numbers messaging people who don't have them saved; raise slowly (e.g. +10 a week).
    WHATSAPP_DAILY_LIMIT: z.coerce.number().int().min(1).default(40),
    // false: the admin runs without WhatsApp (tests, or a machine without Chromium)
    WHATSAPP_ENABLED: z
      .string()
      .default("true")
      .transform((value) => value !== "false"),
    // The WhatsApp sales agent (src/server/agent): OpenRouter for its models
    OPENROUTER_API_KEY: z.string().min(10).optional(),
    // The numbers the agent answers on (it never sends campaigns from them)
    AGENT_ACCOUNTS: z
      .string()
      .default("wa1")
      .transform((value) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))]),
    // off: nothing; shadow: qualifies and logs, never replies; live: replies. The admin's switch overrides it.
    AGENT_MODE: z.enum(["off", "shadow", "live"]).default("off"),
    // The conversation (vision, tools) and its fallback, and Jev for the quick decisions
    AGENT_MODEL: z.string().min(1).default("anthropic/claude-haiku-5.5"),
    AGENT_FALLBACK_MODEL: z.string().min(1).default("openai/gpt-6-luna"),
    JEV_MODEL: z.string().min(1).default("typesafe/jev-1.14"),
  },
  client: {
    // The API (apps/server), e.g. https://api.stayzim.co.zw
    NEXT_PUBLIC_SERVER_URL: z.url(),
    // The web app, for links to sites' dashboards and claim links, e.g. https://stayzim.co.zw
    NEXT_PUBLIC_WEB_URL: z.url(),
    // Lodge sites are {slug}.NEXT_PUBLIC_SITES_DOMAIN
    NEXT_PUBLIC_SITES_DOMAIN: z.string().min(1).default("stayzim.co.zw"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SERVER_INTERNAL_URL: process.env.SERVER_INTERNAL_URL,
    ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN,
    WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH,
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
    WHATSAPP_ACCOUNTS: process.env.WHATSAPP_ACCOUNTS,
    WHATSAPP_DAILY_LIMIT: process.env.WHATSAPP_DAILY_LIMIT,
    WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    AGENT_ACCOUNTS: process.env.AGENT_ACCOUNTS,
    AGENT_MODE: process.env.AGENT_MODE,
    AGENT_MODEL: process.env.AGENT_MODEL,
    AGENT_FALLBACK_MODEL: process.env.AGENT_FALLBACK_MODEL,
    JEV_MODEL: process.env.JEV_MODEL,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_SITES_DOMAIN: process.env.NEXT_PUBLIC_SITES_DOMAIN,
  },
  emptyStringAsUndefined: true,
});
