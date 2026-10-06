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

/** Google sign-in is on when both its settings are present. */
export const googleSignInEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/** Same rule for sign-up and every password change, so the forms can promise it. */
export const MIN_PASSWORD_LENGTH = 8;

export const auth = betterAuth({
  appName: "StayZim",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [...env.CORS_ORIGIN, ...(env.WEB_URL ? [env.WEB_URL] : [])],

  emailAndPassword: {
    enabled: true,
    // Owners sign up themselves (/signup), then build their demo site at /start.
    // StayZim can still create accounts (scripts/create-owner.ts).
    disableSignUp: false,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // No email check before the demo: sign-up to a live site has to take minutes.
    // Invoices and receipts go to this address, so owners have every reason to type it right.
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // The screen says "check your email" either way (it never reveals which emails exist),
      // so a failed send only shows here: one clear line for the server log
      await sendEmail(resetPasswordEmail({ to: user.email, name: user.name, url })).catch((error: unknown) => {
        console.error(`[mail] Could not send the reset email to ${user.email}: ${error instanceof Error ? error.message : String(error)}`);
      });
    },
    onPasswordReset: async ({ user }) => {
      // They chose their own password, so a temporary one no longer applies
      await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
      await sendEmail(passwordChangedEmail({ to: user.email, name: user.name })).catch((error) => {
        console.error("[auth] could not send password changed email:", error);
      });
    },
  },

  // Sign in with Google links to the owner account with the same email, or
  // creates one (sign-up with Google, then /start).
  socialProviders: googleSignInEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  databaseHooks: {
    account: {
      create: {
        // First time an owner links Google while still on the temporary password StayZim
        // sent on WhatsApp: Google has proved who they are, so retire that password
        // (replace it with a random one) and open the dashboard. They can set their
        // own later with Forgot password.
        after: async (account) => {
          if (account.providerId !== "google") return;
          const user = await prisma.user.findUnique({ where: { id: account.userId }, select: { mustChangePassword: true } });
          if (!user?.mustChangePassword) return;
          const ctx = await auth.$context;
          const unusable = await ctx.password.hash(crypto.randomUUID() + crypto.randomUUID());
          await ctx.internalAdapter.updatePassword(account.userId, unusable);
          await prisma.user.update({ where: { id: account.userId }, data: { mustChangePassword: false } });
        },
      },
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
    // In Postgres (the rate_limit table), so a restart doesn't reset the counts
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      // 5 sign-in attempts per 10 minutes, then wait
      "/sign-in/email": { window: 10 * 60, max: 5 },
      // Sign-ups from one IP: enough for a family sharing a phone, not for a script
      "/sign-up/email": { window: 10 * 60, max: 5 },
      "/request-password-reset": { window: 10 * 60, max: 3 },
      "/change-password": { window: 10 * 60, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "stayzim",
    // Rate limits count per visitor IP, read from the header our proxy sets (see CLIENT_IP_HEADER)
    ipAddress: { ipAddressHeaders: [env.CLIENT_IP_HEADER] },
    // In production the API and the web app live on different subdomains
    // (api. and app.stayzim.co.zw), which must share the session cookie
    ...(env.COOKIE_DOMAIN && {
      crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN },
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
