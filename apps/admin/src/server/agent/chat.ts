import prisma from "@stayzim/db";

import { getAccount } from "../outreach/whatsapp";

/** Logs what the agent did (a decision, a reply, a tool, an alert, an error) and what it cost. */
export async function logEvent(input: { contactId: string | null; chatId: string; account: string; kind: string; data: Record<string, unknown>; costUsd?: number }) {
  await prisma.agentEvent
    .create({ data: { contactId: input.contactId, chatId: input.chatId, account: input.account, kind: input.kind, data: input.data as object, costUsd: input.costUsd ?? 0 } })
    .catch((error: unknown) => console.error("[agent] couldn't log an event:", error));
}

/**
 * Sends the agent's message in the lead's chat ("typing…" first) and records
 * it like any other message we send, so it shows in the lead's conversation.
 */
export async function sendInChat(input: { contactId: string; chatId: string; account: string; text: string }) {
  const account = getAccount(input.account);
  if (!account) throw new Error(`No WhatsApp number ${input.account}`);
  const whatsappMessageId = await account.replyInChat(input.chatId, input.text);
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: input.contactId }, select: { phone: true, status: true, reachedVia: true } });
  await prisma.outreachMessage.create({
    data: { contactId: input.contactId, phone: contact.phone, account: input.account, body: input.text, status: "SENT", whatsappMessageId },
  });
  await prisma.contact.update({
    where: { id: input.contactId },
    data: {
      lastContactedAt: new Date(),
      reachedVia: contact.reachedVia ?? input.account,
      ...(contact.status === "PENDING" || contact.status === "FAILED" ? { status: "REACHED" as const } : {}),
    },
  });
  await logEvent({ contactId: input.contactId, chatId: input.chatId, account: input.account, kind: "reply", data: { text: input.text } });
}
