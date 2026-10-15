import prisma from "@stayzim/db";

import { logEvent, sendInChat } from "./chat";
import { checkPayment } from "./payments";
import { getAgentMode } from "./settings";
import { leadSites } from "./tools";
import { followUpMessage } from "./templates";

/**
 * Every 10 minutes: a gentle nudge to leads who got their sites and went quiet
 * (a no reply is "not right now"): one after a day, a last one with the
 * deadline two days later, then nothing. And payments still waiting are checked
 * again, in case the agent's own watch ended first. Live mode only.
 */

const EVERY_MS = 10 * 60 * 1000;
const SECOND_AFTER_MS = 48 * 60 * 60 * 1000;
const MAX_FOLLOW_UPS = 2;

async function tick() {
  if ((await getAgentMode()) !== "live") return;

  const due = await prisma.contact.findMany({
    where: { nextFollowUpAt: { lte: new Date() }, agentStage: "OFFER", agentPaused: false, status: { not: "DO_NOT_CONTACT" }, agentChatId: { not: null } },
    take: 20,
  });
  for (const contact of due) {
    const n = contact.followUps + 1;
    if (n > MAX_FOLLOW_UPS || !contact.agentAccount || !contact.agentChatId) {
      await prisma.contact.update({ where: { id: contact.id }, data: { nextFollowUpAt: null } });
      continue;
    }
    const sites = await leadSites(contact.id);
    try {
      await sendInChat({
        contactId: contact.id,
        chatId: contact.agentChatId,
        account: contact.agentAccount,
        text: followUpMessage(n, { lodge: contact.lodgeName ?? "your place", name: contact.source === "whatsapp" ? null : contact.name, options: sites.length }),
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { followUps: n, nextFollowUpAt: n < MAX_FOLLOW_UPS ? new Date(Date.now() + SECOND_AFTER_MS) : null },
      });
      await logEvent({ contactId: contact.id, chatId: contact.agentChatId, account: contact.agentAccount, kind: "follow_up", data: { n } });
    } catch (error) {
      await logEvent({ contactId: contact.id, chatId: contact.agentChatId, account: contact.agentAccount, kind: "error", data: { step: "follow_up", error: String(error) } });
    }
  }

  // Payments still waiting (the 5-minute watch may have ended first)
  const paying = await prisma.contact.findMany({ where: { agentStage: "PAYING", agentChatId: { not: null } }, take: 20 });
  for (const contact of paying) {
    const last = await prisma.agentEvent.findFirst({ where: { contactId: contact.id, kind: "payment" }, orderBy: { createdAt: "desc" } });
    if (!last || !contact.agentChatId || !contact.agentAccount) continue;
    const data = last.data as { token: string; paymentId: string; slug: string };
    await checkPayment({ contactId: contact.id, chatId: contact.agentChatId, account: contact.agentAccount, ...data }).catch((error: unknown) =>
      console.error("[agent] payment re-check failed:", error),
    );
  }
}

/** Starts the loop once per server process. */
export function startFollowUps() {
  const box = globalThis as unknown as { __stayzimFollowUps?: boolean };
  if (box.__stayzimFollowUps) return;
  box.__stayzimFollowUps = true;
  const timer = setInterval(() => void tick().catch((error: unknown) => console.error("[agent] follow-ups failed:", error)), EVERY_MS);
  timer.unref?.();
}
