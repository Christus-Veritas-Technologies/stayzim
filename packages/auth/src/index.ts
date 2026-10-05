import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { sendEmail } from "@stayzim/mail";
import { passwordChangedEmail, resetPasswordEmail } from "@stayzim/mail/templates";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Optional in the shared env schema (see packages/env/src/server.ts), required here
if (!env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required (32+ characters). See apps/server/.env.example.");
}
if (!env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL is required (the public URL of apps/server). See apps/server/.env.example.");
}

const DAY = 60 * 60 * 24;

/** Same rule for sign-up and every password change, so the forms can promise it. */
export const MIN_PASSWORD_LENGTH = 8;

export const auth = betterAuth({
  appName: "StayZim",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [env.CORS_ORIGIN, ...(env.WEB_URL ? [env.WEB_URL] : [])],

  emailAndPassword: {
    enabled: true,
    // There is no public sign-up: StayZim creates every owner account (scripts/create-owner.ts)
    disableSignUp: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Accounts are created by us with a known email, so there's nothing to verify
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(resetPasswordEmail({ to: user.email, name: user.name, url }));
    },
    onPasswordReset: async ({ user }) => {
      // They chose their own password, so a temporary one no longer applies
      await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
      await sendEmail(passwordChangedEmail({ to: user.email, name: user.name })).catch((error) => {
        console.error("[auth] could not send password changed email:", error);
      });
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "OWNER", input: false },
      mustChangePassword: { type: "boolean", defaultValue: false, input: false },
    },
  },

  session: {
    // Owners stay signed in on their phone for 30 days; each visit after a day extends it
    expiresIn: 30 * DAY,
    updateAge: DAY,
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      // 5 sign-in attempts per 10 minutes, then wait
      "/sign-in/email": { window: 10 * 60, max: 5 },
      "/request-password-reset": { window: 10 * 60, max: 3 },
      "/change-password": { window: 10 * 60, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "stayzim",
    // In production the API and the web app live on different subdomains
    // (api. and app.stayzim.co.zw), which must share the session cookie
    ...(env.COOKIE_DOMAIN && {
      crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN },
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
