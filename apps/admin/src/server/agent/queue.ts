import { isAgentAccount } from "./settings";

/**
 * Batches what someone sends the agent's number: a turn runs 10 s after their
 * last message (people send bursts: text, then six photos), one turn per chat
 * at a time, and again if more came in while it ran. Kept on globalThis, like
 * the WhatsApp numbers, so Next.js can't run two queues.
 */

const DEBOUNCE_MS = 10_000;

type Queue = { timers: Map<string, ReturnType<typeof setTimeout>>; running: Set<string>; again: Set<string> };
const box = globalThis as unknown as { __stayzimAgentQueue?: Queue };
const queue = (box.__stayzimAgentQueue ??= { timers: new Map(), running: new Set(), again: new Set() });

export function queueAgentTurn(account: string, chatId: string) {
  if (!isAgentAccount(account)) return;
  const key = `${account}|${chatId}`;
  clearTimeout(queue.timers.get(key));
  const timer = setTimeout(() => void run(account, chatId), DEBOUNCE_MS);
  timer.unref?.();
  queue.timers.set(key, timer);
}

async function run(account: string, chatId: string) {
  const key = `${account}|${chatId}`;
  queue.timers.delete(key);
  if (queue.running.has(key)) {
    queue.again.add(key);
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
    if (queue.again.delete(key)) queueAgentTurn(account, chatId);
  }
}
