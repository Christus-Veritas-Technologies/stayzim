import prisma from "@stayzim/db";

import { logEvent, sendInChat } from "./chat";
import { sweepPayments } from "./payments";
import { getAgentMode } from "./settings";
import { givenName, leadSites } from "./tools";
import { detailsNudgeMessage, followUpMessage } from "./templates";

/**
 * Every 10 minutes: a gentle nudge to leads who got their sites and went quiet
 * (a no reply is "not right now"): one after a day, a last one with the
 * deadline two days later, then nothing. And every minute, payment links that
 * aren't paid yet (payments.ts). Live mode only.
 */

const EVERY_MS = 10 * 60 * 1000;
/** The second nudge a day after the first: the morning the 2-day preview ends */
const SECOND_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_FOLLOW_UPS = 2;

async function tick() {
  if ((await getAgentMode()) !== "live") return;

  const due = await prisma.contact.findMany({
    where: { nextFollowUpAt: { lte: new Date() }, agentStage: { in: ["OFFER", "DETAILS"] }, agentPaused: false, status: { not: "DO_NOT_CONTACT" }, agentChatId: { not: null } },
    take: 20,
  });
  for (const contact of due) {
    if (!contact.agentAccount || !contact.agentChatId) continue;
    // Details: one nudge only
    if (contact.agentStage === "DETAILS") {
      if (contact.followUps === 0) {
        await sendInChat({ contactId: contact.id, chatId: contact.agentChatId, account: contact.agentAccount, text: detailsNudgeMessage(contact.lodgeName) }).catch(() => {});
        await logEvent({ contactId: contact.id, chatId: contact.agentChatId, account: contact.agentAccount, kind: "follow_up", data: { n: 1, stage: "DETAILS" } });
      }
      await prisma.contact.update({ where: { id: contact.id }, data: { followUps: 1, nextFollowUpAt: null } });
      continue;
    }
    const n = contact.followUps + 1;
    if (n > MAX_FOLLOW_UPS) {
      await prisma.contact.update({ where: { id: contact.id }, data: { nextFollowUpAt: null } });
      continue;
    }
    const sites = await leadSites(contact.id);
    try {
      await sendInChat({
        contactId: contact.id,
        chatId: contact.agentChatId,
        account: contact.agentAccount,
        text: followUpMessage(n, { lodge: contact.lodgeName ?? "your place", name: givenName(contact), options: sites.length }),
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
}

/** Every minute: links sent to pay with that aren't paid (a payment made later, or a watch a redeploy cut short) */
const PAYMENTS_EVERY_MS = 60 * 1000;

async function paymentsTick() {
  if ((await getAgentMode()) !== "live") return;
  await sweepPayments();
}

/** Starts the loops once per server process. */
export function startFollowUps() {
  const box = globalThis as unknown as { __stayzimFollowUps?: boolean };
  if (box.__stayzimFollowUps) return;
  box.__stayzimFollowUps = true;
  const timer = setInterval(() => void tick().catch((error: unknown) => console.error("[agent] follow-ups failed:", error)), EVERY_MS);
  timer.unref?.();
  let sweeping = false;
  const payments = setInterval(() => {
    if (sweeping) return;
    sweeping = true;
    void paymentsTick()
      .catch((error: unknown) => console.error("[agent] payment sweep failed:", error))
      .finally(() => (sweeping = false));
  }, PAYMENTS_EVERY_MS);
  payments.unref?.();
}
