import prisma from "@stayzim/db";
import { env } from "@stayzim/env/admin";

import { getAccount } from "../outreach/whatsapp";
import { isAgentAccount } from "./settings";

/**
 * Batches what someone sends the agent's number, so a burst gets one answer
 * (and one model call), not one per message:
 * - a turn runs 5 s after their last message, and each new one within that
 *   gap starts the 5 s again; after a photo, video, voice note or document,
 *   10 s (an album arrives one photo at a time, and each is downloaded);
 * - a burst never holds the answer more than 30 s from its first message;
 * - one turn per chat at a time: anything that comes in while it runs is
 *   answered by the next turn, all together, and the running turn drops a
 *   reply that's already out of date (see superseded());
 * - a number that isn't connected (a restart) waits for it, up to 10 minutes;
 * - after a redeploy, chats whose last messages (15 minutes) never got a turn
 *   get one (resumeUnansweredChats): the timers lived in the old process.
 * Kept on globalThis, like the WhatsApp numbers, so Next.js can't run two queues.
 */

export const GAP_MS = 5_000;
export const MEDIA_GAP_MS = 10_000;
export const MAX_WAIT_MS = 30_000;
const NOT_READY_RETRY_MS = 15_000;
const NOT_READY_TRIES = 40;
/** A reply dropped this many times in a row for newer messages goes out anyway (someone typing non-stop still gets an answer) */
const MAX_SUPERSEDED = 2;

const MEDIA_TYPES = new Set(["image", "video", "audio", "ptt", "document", "sticker"]);

/** When the chat's turn runs: GAP_MS after this message (MEDIA_GAP_MS after media), never past MAX_WAIT_MS from the burst's first message. */
export function scheduleTurn(burstStartedAt: number | null, now: number, type = "chat") {
  const startedAt = burstStartedAt ?? now;
  const gap = MEDIA_TYPES.has(type) ? MEDIA_GAP_MS : GAP_MS;
  return { startedAt, runAt: Math.max(now, Math.min(now + gap, startedAt + MAX_WAIT_MS)) };
}

type Pending = { timer: ReturnType<typeof setTimeout>; startedAt: number };
type Queue = { pending: Map<string, Pending>; running: Set<string>; again: Set<string>; superseded: Map<string, number> };
const box = globalThis as unknown as { __stayzimAgentQueue?: Queue };
const queue = (box.__stayzimAgentQueue ??= { pending: new Map(), running: new Set(), again: new Set(), superseded: new Map() });
// An older copy of this module kept its own fields
queue.pending ??= new Map();
queue.superseded ??= new Map();

const keyOf = (account: string, chatId: string) => `${account}|${chatId}`;

/** A message came in on an agent number (its type, for media): (re)starts the chat's timer. */
export function queueAgentTurn(account: string, chatId: string, type = "chat") {
  if (!isAgentAccount(account)) return;
  const key = keyOf(account, chatId);
  const current = queue.pending.get(key);
  if (current) clearTimeout(current.timer);
  const now = Date.now();
  const { startedAt, runAt } = scheduleTurn(current?.startedAt ?? null, now, type);
  const timer = setTimeout(() => void run(account, chatId), runAt - now);
  timer.unref?.();
  queue.pending.set(key, { timer, startedAt });
}

/**
 * More messages came in since this turn started (they'll get their own turn,
 * with everything): its plain reply is out of date, so the turn drops it. Not
 * more than MAX_SUPERSEDED times in a row, so someone typing non-stop still hears back.
 */
export function superseded(account: string, chatId: string) {
  const key = keyOf(account, chatId);
  if (!queue.pending.has(key) && !queue.again.has(key)) return false;
  const times = queue.superseded.get(key) ?? 0;
  if (times >= MAX_SUPERSEDED) return false;
  queue.superseded.set(key, times + 1);
  return true;
}

/** The chat got an answer: dropped replies start counting again. */
export function answered(account: string, chatId: string) {
  queue.superseded.delete(keyOf(account, chatId));
}

async function run(account: string, chatId: string, tries = 0) {
  const key = keyOf(account, chatId);
  queue.pending.delete(key);
  if (queue.running.has(key)) {
    queue.again.add(key);
    return;
  }
  // The number is restarting: wait for it rather than lose the turn
  if (!getAccount(account)?.isReady) {
    if (tries < NOT_READY_TRIES) setTimeout(() => void run(account, chatId, tries + 1), NOT_READY_RETRY_MS).unref?.();
    else console.error(`[agent] ${account} wasn't connected for 10 minutes: no turn for ${chatId}`);
    return;
  }
  queue.running.add(key);
  try {
    const { handleChat } = await import("./agent");
    await handleChat(account, chatId);
  } catch (error) {
    console.error(`[agent] turn for ${chatId} failed:`, error);
  } finally {
    queue.running.delete(key);
    // Messages that came in while it ran (their timer already fired): their turn now, after the usual gap
    if (queue.again.delete(key) && !queue.pending.has(key)) queueAgentTurn(account, chatId);
  }
}

/** How far back a restart looks for messages that never got their turn (as far as the agent answers at all) */
const RESUME_MS = 15 * 60 * 1000;

/**
 * After a restart: each agent-number chat whose latest message (last 15
 * minutes) came after the agent's last decision on it gets a turn, through the
 * usual queue (which waits for the number to connect).
 */
export async function resumeUnansweredChats() {
  const since = new Date(Date.now() - RESUME_MS);
  const recent = await prisma.inboundMessage.findMany({
    where: { account: { in: env.AGENT_ACCOUNTS }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { account: true, chatId: true, contactId: true, createdAt: true },
  });
  const latest = new Map<string, (typeof recent)[number]>();
  for (const message of recent) if (!latest.has(keyOf(message.account, message.chatId))) latest.set(keyOf(message.account, message.chatId), message);

  let resumed = 0;
  for (const message of latest.values()) {
    const handled = message.contactId
      ? await prisma.agentEvent.findFirst({ where: { contactId: message.contactId, kind: { in: ["turn", "decision", "limit"] }, createdAt: { gte: message.createdAt } }, select: { id: true } })
      : null;
    if (handled) continue;
    queueAgentTurn(message.account, message.chatId);
    resumed += 1;
  }
  if (resumed) console.log(`[agent] ${resumed} chat${resumed === 1 ? "" : "s"} with unanswered messages from before the restart: turns queued`);
}
