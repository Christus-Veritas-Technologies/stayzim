import prisma from "@stayzim/db";

import { getAccount } from "../outreach/whatsapp";
import { logEvent } from "./chat";
import { getAgentMode } from "./settings";

/**
 * WhatsApp Business labels on the agent's chats, by stage, so the
 * click-to-WhatsApp ads learn which conversations became customers. They're
 * the labels every WhatsApp Business account starts with; one at a time
 * (the stage's), and the team's own labels are left alone. Live mode only.
 */

export const STAGE_LABELS: Partial<Record<string, string>> = {
  DETAILS: "New customer",
  BUILDING: "New customer",
  OFFER: "New customer",
  CHOSEN: "Pending payment",
  PAYING: "Pending payment",
  PAID: "Paid",
};

const MANAGED = [...new Set(Object.values(STAGE_LABELS))] as string[];

/** Numbers missing a label, reported once each (until a restart) */
const reported = new Set<string>();

/** Labels the lead's chat for its current stage (no change for stages without a label). Never throws. */
export async function labelChat(contactId: string) {
  try {
    if ((await getAgentMode()) !== "live") return;
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { agentStage: true, agentChatId: true, agentAccount: true } });
    const label = contact && STAGE_LABELS[contact.agentStage];
    if (!contact?.agentChatId || !contact.agentAccount || !label) return;
    const account = getAccount(contact.agentAccount);
    if (!account?.isReady) return;
    const result = await account.setChatLabel(contact.agentChatId, label, MANAGED);
    if (result === "set") await logEvent({ contactId, chatId: contact.agentChatId, account: contact.agentAccount, kind: "label", data: { label } });
    if (result === "missing" && !reported.has(`${contact.agentAccount}:${label}`)) {
      reported.add(`${contact.agentAccount}:${label}`);
      const error = `no "${label}" label on ${contact.agentAccount} (is it a WhatsApp Business account?)`;
      await logEvent({ contactId, chatId: contact.agentChatId, account: contact.agentAccount, kind: "error", data: { step: "label", error } });
    }
  } catch (error) {
    console.error("[agent] labelling failed:", error);
  }
}
