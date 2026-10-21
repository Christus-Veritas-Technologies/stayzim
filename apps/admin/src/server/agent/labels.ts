import prisma from "@stayzim/db";

import { getAccount } from "../outreach/whatsapp";
import { logEvent } from "./chat";
import type { Qualification } from "./qualify";
import { getAgentMode } from "./settings";

/**
 * WhatsApp Business labels on the agent's chats, so the click-to-WhatsApp ads
 * learn who's a real prospect. A label says how sure we are, and only moves up:
 * - Unqualified: clearly not for us (off-topic, junk, job seekers, selling to us);
 * - no label while it's unclear (a greeting, half-interested, only asking prices);
 * - Qualified: they run a place to stay and sent photos of it (or their sites
 *   were made), whatever happens after;
 * - Pending payment once they choose, then Paid.
 * Only these four move; the team's own labels stay. Live mode only.
 */

export const LABEL_NAMES = { unqualified: "Unqualified", qualified: "Qualified", paying: "Pending payment", paid: "Paid" } as const;
export type AdLabel = keyof typeof LABEL_NAMES;

const RANK: Record<AdLabel, number> = { unqualified: 0, qualified: 1, paying: 2, paid: 3 };

export type LabelSignals = {
  stage: string;
  /** The label the chat has now (ours) */
  current: AdLabel | null;
  /** Jev's answers on this batch */
  jev?: Qualification | null;
  /** The gate ignored them (junk), or the agent went silent as not a fit */
  notAFit?: boolean;
  /** The agent's own call (label_lead) */
  agent?: "qualified" | "unqualified";
};

/** Photos that are clearly of a place where guests stay, from someone who runs one */
const sentPropertyPhotos = (jev: Qualification | null | undefined) => Boolean(jev && (jev.photosOfProperty ?? 0) >= 0.6 && jev.placeToStay >= 0.5);

/** The label the chat should have now (null: none yet). Never lower than the one it has, except out of Unqualified. */
export function adLabel(signals: LabelSignals): AdLabel | null {
  let wanted: AdLabel | null = null;
  if (signals.stage === "PAID") wanted = "paid";
  else if (signals.stage === "CHOSEN" || signals.stage === "PAYING") wanted = "paying";
  else if (signals.stage === "BUILDING" || signals.stage === "OFFER" || signals.agent === "qualified" || sentPropertyPhotos(signals.jev)) wanted = "qualified";
  else if (signals.notAFit || signals.agent === "unqualified") wanted = "unqualified";

  const current = signals.current;
  if (!wanted || !current) return wanted ?? current;
  // Unqualified never replaces a better label; anything better replaces Unqualified
  if (wanted === "unqualified") return current;
  return current === "unqualified" || RANK[wanted] > RANK[current] ? wanted : current;
}

/** Numbers missing a label, reported once each (until a restart) */
const reported = new Set<string>();

/** Works out the chat's label from the lead and these signals, saves it on the lead and sets it in WhatsApp. Never throws. */
export async function labelChat(contactId: string, signals: Omit<LabelSignals, "stage" | "current"> = {}) {
  try {
    if ((await getAgentMode()) !== "live") return;
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { agentStage: true, agentChatId: true, agentAccount: true, qualification: true } });
    if (!contact?.agentChatId || !contact.agentAccount) return;
    const saved = (contact.qualification as { adLabel?: AdLabel } | null)?.adLabel ?? null;
    const label = adLabel({ ...signals, stage: contact.agentStage, current: saved });
    if (!label) return;
    if (label !== saved) {
      await prisma.contact.update({ where: { id: contactId }, data: { qualification: { ...((contact.qualification as object | null) ?? {}), adLabel: label } } });
    }

    const account = getAccount(contact.agentAccount);
    if (!account?.isReady) return;
    const name = LABEL_NAMES[label];
    const result = await account.setChatLabel(contact.agentChatId, name, Object.values(LABEL_NAMES));
    if (result === "set") await logEvent({ contactId, chatId: contact.agentChatId, account: contact.agentAccount, kind: "label", data: { label: name } });
    if (result === "missing" && !reported.has(`${contact.agentAccount}:${name}`)) {
      reported.add(`${contact.agentAccount}:${name}`);
      const error = `no "${name}" label on ${contact.agentAccount}: add it in WhatsApp Business (Settings → Business tools → Labels)`;
      await logEvent({ contactId, chatId: contact.agentChatId, account: contact.agentAccount, kind: "error", data: { step: "label", error } });
    }
  } catch (error) {
    console.error("[agent] labelling failed:", error);
  }
}
