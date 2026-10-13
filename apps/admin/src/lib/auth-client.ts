import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/lib/public-env";

/** better-auth on the API (`/api/auth/*`): the same StayZim login as the web app, shared on .stayzim.co.zw. */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  fetchOptions: { credentials: "include" },
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", input: false },
        mustChangePassword: { type: "boolean", input: false },
        isAnonymous: { type: "boolean", input: false },
      },
    }),
  ],
});

/** Plain-language messages for better-auth's error codes. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined) {
  if (!error) return "Something went wrong. Try again.";
  if (error.status === 429) return "Too many attempts. Wait 10 minutes, then try again.";
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") return "Email or password is wrong.";
  return error.message || "Something went wrong. Try again.";
}
