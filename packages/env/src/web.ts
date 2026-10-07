import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Optional: how this app's own server reaches the API, e.g. http://server:9998 inside
    // Docker. Server-side fetches (lodge site pages) use it instead of the public URL,
    // so they don't leave the machine. Defaults to NEXT_PUBLIC_SERVER_URL.
    SERVER_INTERNAL_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    // StayZim's sales WhatsApp number, digits only with country code (e.g. 263771234567).
    // Every call to action on the landing page opens a chat with it.
    NEXT_PUBLIC_WHATSAPP_NUMBER: z
      .string()
      .regex(/^\d{8,15}$/, "Digits only, with country code")
      .optional(),
    // Lodge sites are {slug}.NEXT_PUBLIC_SITES_DOMAIN. "stayzim.co.zw" in production;
    // "localhost:9999" locally, so mistvalley.localhost:9999 opens Mist Valley's site.
    NEXT_PUBLIC_SITES_DOMAIN: z.string().min(1).default("stayzim.co.zw"),
    // The Meta (Facebook) Pixel (its ID is in apps/web/src/lib/meta-pixel.ts) is on in
    // production builds of StayZim's own pages. "off" leaves it out, as CI does.
    NEXT_PUBLIC_META_PIXEL: z.enum(["on", "off"]).optional(),
  },
  runtimeEnv: {
    SERVER_INTERNAL_URL: process.env.SERVER_INTERNAL_URL,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    NEXT_PUBLIC_SITES_DOMAIN: process.env.NEXT_PUBLIC_SITES_DOMAIN,
    NEXT_PUBLIC_META_PIXEL: process.env.NEXT_PUBLIC_META_PIXEL,
  },
  emptyStringAsUndefined: true,
});
