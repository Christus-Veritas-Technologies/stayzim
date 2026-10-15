import prisma from "@stayzim/db";

import type { OwnMessageEvent } from "../outreach/whatsapp";
import { logEvent } from "./chat";
import { queueAgentTurn } from "./queue";
import { isAgentAccount } from "./settings";
import { leadSites } from "./tools";

/**
 * Messages Kin types on an agent number's phone, in a lead's chat:
 *   /silence  the agent stops replying in this chat (until /resume)
 *   /resume   it carries on (also lifts a /ban), and answers anything waiting
 *   /ban      it never speaks in this chat again (and campaigns skip them)
 * Commands are deleted for everyone at once, so the other person never sees them.
 * Anything else Kin types is recorded as our message, so the agent sees it and
 * doesn't answer on top of it.
 */

const COMMAND = /^\s*\/(silence|resume|ban)\s*$/i;

/** The lead in this chat, made if there isn't one (so a /ban or /silence sticks) */
async function leadFor(event: OwnMessageEvent) {
  const byChat = await prisma.contact.findFirst({ where: { agentChatId: event.chatId } });
  if (byChat) return byChat;
  if (!event.phone) return null;
  return prisma.contact.upsert({
    where: { phone: event.phone },
    create: { name: `+${event.phone}`, phone: event.phone, city: "", source: "whatsapp", agentChatId: event.chatId, agentAccount: event.account },
    update: { agentChatId: event.chatId, agentAccount: event.account },
  });
}

export async function handleOwnMessage(event: OwnMessageEvent) {
  if (!isAgentAccount(event.account)) return;
  // The app's own sends are recorded when sent: not Kin's
  if (await prisma.outreachMessage.findFirst({ where: { whatsappMessageId: event.whatsappMessageId }, select: { id: true } })) return;
  if (await prisma.agentEvent.findFirst({ where: { kind: "command", chatId: event.chatId, data: { path: ["messageId"], equals: event.whatsappMessageId } }, select: { id: true } })) return;

  const command = COMMAND.exec(event.body)?.[1]?.toLowerCase();
  const contact = await leadFor(event);

  if (command) {
    await event.deleteForEveryone();
    if (!contact) {
      await logEvent({ contactId: null, chatId: event.chatId, account: event.account, kind: "error", data: { command, messageId: event.whatsappMessageId, error: "no lead for this chat (WhatsApp hid their number)" } });
      return;
    }
    if (command === "silence") {
      await prisma.contact.update({ where: { id: contact.id }, data: { agentPaused: true, nextFollowUpAt: null } });
    } else if (command === "ban") {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { agentPaused: true, status: "DO_NOT_CONTACT", agentStage: "DISQUALIFIED", disqualifiedReason: "banned by Kin (/ban)", nextFollowUpAt: null },
      });
    } else {
      const sites = await leadSites(contact.id);
      const wasBanned = contact.disqualifiedReason?.startsWith("banned by Kin");
      const stage =
        contact.agentStage === "HANDOVER" || contact.agentStage === "DISQUALIFIED" ? (sites.length ? "OFFER" : contact.lodgeName ? "DETAILS" : "NEW") : contact.agentStage;
      await prisma.contact.update({
        where: { id: contact.id },
        data: { agentPaused: false, agentStage: stage, disqualifiedReason: null, ...(wasBanned ? { status: "REACHED" as const } : {}) },
      });
      queueAgentTurn(event.account, event.chatId);
    }
    await logEvent({ contactId: contact.id, chatId: event.chatId, account: event.account, kind: "command", data: { command, messageId: event.whatsappMessageId } });
    return;
  }

  // Kin replied from the phone: part of the conversation the agent reads
  if (!contact || !event.body.trim()) return;
  await prisma.outreachMessage.create({
    data: { contactId: contact.id, phone: contact.phone, account: event.account, body: event.body, status: "SENT", whatsappMessageId: event.whatsappMessageId, createdAt: event.sentAt },
  });
  await logEvent({ contactId: contact.id, chatId: event.chatId, account: event.account, kind: "kin_reply", data: { text: event.body } });
}
