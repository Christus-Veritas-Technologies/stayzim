/**
 * Drives the sales agent's tools the way the model would, against the local
 * API, without WhatsApp or OpenRouter: a lead on wa1 who sent photos, then
 * save_details, make_sites, choose_site, start_ecocash (the Paynow stand-in)
 * and check_payment. Messages the agent would send are printed instead.
 *
 *   bun scripts/agent-tools-check.ts <photo> [<photo>...]
 */
import { readFileSync } from "node:fs";

import prisma from "@stayzim/db";

import { runTool, type ToolContext } from "../src/server/agent/tools";

const photos = process.argv.slice(2);
const phone = `26377555${String(Date.now()).slice(-4)}`;
const chatId = `${phone}@c.us`;

const contact = await prisma.contact.create({
  data: { name: "Agent Test", phone, city: "", source: "whatsapp", agentChatId: chatId, agentAccount: "wa1", agentStage: "DETAILS" },
});
for (const [index, path] of photos.entries()) {
  const inbound = await prisma.inboundMessage.create({
    data: { contactId: contact.id, phone, chatId, account: "wa1", body: "", type: "image", whatsappMessageId: `test-${phone}-${index}` },
  });
  const data = readFileSync(path);
  await prisma.inboundMedia.create({ data: { inboundMessageId: inbound.id, mimeType: "image/jpeg", data: new Uint8Array(data), sizeBytes: data.byteLength } });
}

const ctx: ToolContext = {
  contactId: contact.id,
  chatId,
  account: "wa1",
  send: async (text) => console.log(`\n--- WOULD SEND (${text.length} chars) ---\n${text}\n---`),
  log: async (kind, data) => {
    await prisma.agentEvent.create({ data: { contactId: contact.id, chatId, account: "wa1", kind, data: data as object } });
  },
};

const step = async (name: string, args: Record<string, unknown> = {}) => {
  const result = await runTool(name, args, ctx);
  console.log(`\n[${name}] ${result}`);
};

await step("make_sites");
await step("save_details", { lodge_name: "Agent Test Lodge", city: "Masvingo", email: "owner@agent-test.local", rooms: 10, kind: "lodge" });
await step("make_sites");
await step("make_sites");
await step("choose_site", { option: 4 });
await step("choose_site", { option: 2 });
await step("start_ecocash", { phone: "12345" });
await step("start_ecocash", { phone: phone });
await new Promise((resolve) => setTimeout(resolve, 12_000));
await step("check_payment");

const after = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id }, select: { agentStage: true, lodgeName: true, city: true, email: true, nextFollowUpAt: true, qualification: true } });
console.log("\nLead now:", after);
console.log("Photos used:", await prisma.inboundMedia.count({ where: { usedAt: { not: null }, inboundMessage: { contactId: contact.id } } }), "of", photos.length);
process.exit(0);
