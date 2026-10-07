import { env } from "@/lib/public-env";
import { anonymousClient, inferAdditionalFields } from "better-auth/client/plugins";
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
        isAnonymous: { type: "boolean", input: false },
      },
    }),
    // Guest accounts for /create: the demo comes first, the email after ("Claim my site")
    anonymousClient(),
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
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already an account with this email. Log in instead, or use Forgot password.";
    case "INVALID_EMAIL":
      return "Check your email address.";
    default:
      return error.message || "Something went wrong. Try again.";
  }
}

/** Plain-language messages for the `?error=` better-auth adds when Google sign-in can't finish. */
export function oauthErrorMessage(code: string | null) {
  if (!code) return null;
  switch (code) {
    case "account_not_linked":
      return "That Google account can't be linked to your login. Log in with your email and password.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    default:
      return "Google sign-in didn't work. Try again, or log in with your email and password.";
  }
}
