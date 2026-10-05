import { env } from "@stayzim/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Talks to better-auth on apps/server (`/api/auth/*`). The session lives in an httpOnly cookie. */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  fetchOptions: { credentials: "include" },
  plugins: [
    // Mirrors the extra user fields in packages/auth, so they're typed on the client
    inferAdditionalFields({
      user: {
        role: { type: "string", input: false },
        mustChangePassword: { type: "boolean", input: false },
      },
    }),
  ],
});

/** Must match MIN_PASSWORD_LENGTH in packages/auth. */
export const MIN_PASSWORD_LENGTH = 8;

/** Plain-language messages for better-auth's error codes. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined) {
  if (!error) return "Something went wrong. Try again.";
  if (error.status === 429) return "Too many attempts. Wait 10 minutes, then try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email or password is wrong.";
    case "INVALID_TOKEN":
      return "This link has expired or was already used. Ask for a new one.";
    case "PASSWORD_TOO_SHORT":
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    default:
      return error.message || "Something went wrong. Try again.";
  }
}

/** POST to our own API (not better-auth), sending the session cookie. */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string } & T;
    if (!response.ok) return { error: json.error ?? "Something went wrong. Try again." };
    return { data: json };
  } catch {
    return { error: "Could not reach StayZim. Check your connection and try again." };
  }
}
