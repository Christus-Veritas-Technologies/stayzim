/**
 * Makes sure StayZim's own team login exists: ADMIN_EMAIL with the password
 * ADMIN_PASSWORD, role ADMIN, for the admin app (admin.stayzim.co.zw).
 *
 * Runs on every start of the server container (docker/start.sh). It only ever
 * creates the account: once it exists, nothing is changed, so a password chosen
 * later (Forgot password) stays. Without both settings it does nothing.
 *
 *   ADMIN_EMAIL=hello@stayzim.co.zw ADMIN_PASSWORD=… bun scripts/ensure-admin.ts
 */
import prisma from "@stayzim/db";
import { createLocalAccountIssuer } from "better-auth/db";

import { auth, MIN_PASSWORD_LENGTH } from "../src/index";

function log(message: string) {
  console.log(`[ensure-admin] ${message}`);
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  log("ADMIN_EMAIL or ADMIN_PASSWORD isn't set: skipped");
} else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  log(`ADMIN_EMAIL "${email}" isn't an email address: skipped`);
} else if (password.length < MIN_PASSWORD_LENGTH) {
  log(`ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters: skipped`);
} else {
  const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (existing) {
    log(`${email} already exists (${existing.role}): left as it is`);
  } else {
    const ctx = await auth.$context;
    // The same calls create-owner makes, but the password is final: no "choose your own" first
    const user = await ctx.internalAdapter.createUser(
      { email, name: "StayZim", emailVerified: true, role: "ADMIN", mustChangePassword: false },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      // Sign-in only accepts credential accounts with exactly this issuer
      issuer: createLocalAccountIssuer("credential"),
      accountId: user.id,
      password: await ctx.password.hash(password),
    });
    log(`created the team login ${email}`);
  }
}

await prisma.$disconnect();
