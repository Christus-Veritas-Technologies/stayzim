import { accountIds, getAccount } from "../outreach/whatsapp";
import { logEvent } from "./chat";
import { getAgentMode, isAgentAccount } from "./settings";

/** Kin's own WhatsApp: where the agent's alerts go (hot leads, choices, payments, hand-overs). */
export const KIN_PHONE = "263789859332";

/**
 * A short note to Kin's phone, from a campaign number (wa3 first), never from
 * the agent's own number. Live mode only. Never throws: an alert that can't go
 * is logged.
 */
export async function alertKin(text: string) {
  if ((await getAgentMode()) !== "live") return false;
  const order = ["wa3", ...accountIds.filter((id) => id !== "wa3")].filter((id) => !isAgentAccount(id));
  for (const id of order) {
    const account = getAccount(id);
    if (!account?.isReady) continue;
    try {
      const sent = await account.send(KIN_PHONE, `StayZim agent: ${text}`);
      if (sent.sent) {
        await logEvent({ contactId: null, chatId: `${KIN_PHONE}@c.us`, account: id, kind: "alert", data: { text } });
        return true;
      }
    } catch (error) {
      console.error(`[agent] alert from ${id} failed:`, error);
    }
  }
  console.error(`[agent] couldn't alert Kin (no number connected): ${text}`);
  await logEvent({ contactId: null, chatId: `${KIN_PHONE}@c.us`, account: "none", kind: "error", data: { alert: text, error: "no number connected to alert Kin" } });
  return false;
}
