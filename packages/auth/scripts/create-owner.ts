/**
 * Creates a dashboard login, or gives an existing one a new temporary password.
 * There is no public sign-up: every owner account is made here.
 *
 *   pnpm --filter @stayzim/auth create-owner --email owner@lodge.co.zw --name "Tendai Moyo"
 *   pnpm --filter @stayzim/auth create-owner --email owner@lodge.co.zw --reset
 *   pnpm --filter @stayzim/auth create-owner --email kin@stayzim.co.zw --name Kin --admin
 *
 * Prints a temporary password to send the owner (on WhatsApp). They must choose
 * their own password on first sign-in.
 */
import { parseArgs } from "node:util";

import prisma from "@stayzim/db";
import { createLocalAccountIssuer } from "better-auth/db";

import { auth, MIN_PASSWORD_LENGTH } from "../src/index";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
    admin: { type: "boolean", default: false },
    reset: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Easy to read out or type on a phone: no 0/O, 1/l/I. */
function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

const email = values.email?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Pass a valid --email.");

const password = values.password ?? temporaryPassword();
if (password.length < MIN_PASSWORD_LENGTH) fail(`--password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

const ctx = await auth.$context;
const hash = await ctx.password.hash(password);
const existing = await prisma.user.findUnique({ where: { email } });

if (values.reset) {
  if (!existing) fail(`No account for ${email}. Leave out --reset to create one.`);
  await ctx.internalAdapter.updatePassword(existing.id, hash);
  await prisma.user.update({ where: { id: existing.id }, data: { mustChangePassword: true } });
  // Sign them out everywhere, so only the new password works
  await prisma.session.deleteMany({ where: { userId: existing.id } });
  console.log(`\nNew temporary password for ${existing.name} <${email}>`);
} else {
  if (existing) fail(`${email} already has an account. Add --reset to give it a new temporary password.`);
  const name = values.name?.trim();
  if (!name) fail("Pass --name for a new account.");

  // Same calls better-auth's admin plugin makes to create a user with a password
  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name,
      emailVerified: true,
      role: values.admin ? "ADMIN" : "OWNER",
      mustChangePassword: true,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    // Sign-in only accepts credential accounts with exactly this issuer
    issuer: createLocalAccountIssuer("credential"),
    accountId: user.id,
    password: hash,
  });
  console.log(`\nCreated ${values.admin ? "admin" : "owner"} account for ${name} <${email}>`);
}

console.log(`Temporary password: ${password}`);
console.log("They will be asked to choose their own password when they first sign in.\n");
await prisma.$disconnect();
