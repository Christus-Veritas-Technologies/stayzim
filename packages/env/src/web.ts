import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    // StayZim's sales WhatsApp number, digits only with country code (e.g. 263771234567).
    // Every call to action on the landing page opens a chat with it.
    NEXT_PUBLIC_WHATSAPP_NUMBER: z
      .string()
      .regex(/^\d{8,15}$/, "Digits only, with country code")
      .optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  },
  emptyStringAsUndefined: true,
});
