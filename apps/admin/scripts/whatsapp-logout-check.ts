/**
 * A throwaway WhatsApp number ("watest", in the local database) through the
 * WhatsApp page's buttons, with a real browser: it starts to its QR code; Log
 * out closes it and deletes its login, and it stays logged out; Link again
 * brings a new QR; Restart then Log out straight away (a start cancelled
 * halfway) leaves it logged out, with nothing coming back to life later.
 *
 *   WHATSAPP_ENABLED=true bun scripts/whatsapp-logout-check.ts
 */
import { existsSync } from "node:fs";

import prisma from "@stayzim/db";

const { WhatsAppAccount } = await import("../src/server/outreach/whatsapp");

const results: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail && !ok ? `: ${detail}` : ""}`);
};
const until = async (what: () => boolean, ms: number) => {
  const end = Date.now() + ms;
  while (Date.now() < end && !what()) await new Promise((resolve) => setTimeout(resolve, 500));
  return what();
};

const browser = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/chromium", "/usr/bin/google-chrome"].find((path) => existsSync(path));
const account = new WhatsAppAccount("watest");
const state = () => account.getStatus().state;
const client = () => (account as unknown as { client?: unknown }).client;

void account.start(browser);
check("it starts to a QR code", await until(() => state() === "qr", 120_000), state());

await account.logOut();
check("Log out: logged out, browser closed", state() === "stopped" && !client(), state());
check("and its login deleted", !(await prisma.whatsappSession.findUnique({ where: { session: account.sessionName } })));
await new Promise((resolve) => setTimeout(resolve, 20_000));
check("it stays logged out", state() === "stopped" && !client(), state());

await account.relink();
check("Link again: a new QR code", await until(() => state() === "qr", 120_000), state());

// Restart, then Log out while it's still starting: the cancelled start must not come back
account.restartNow();
await until(() => state() === "starting", 5_000);
await new Promise((resolve) => setTimeout(resolve, 3_000));
await account.logOut();
await new Promise((resolve) => setTimeout(resolve, 45_000));
check("a start cancelled halfway stays cancelled", state() === "stopped" && !client(), `${state()} client=${Boolean(client())}`);

await account.stop();
console.log(`\n${results.filter((result) => result.ok).length}/${results.length} passed`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
