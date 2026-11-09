/**
 * Which of their messages a turn answers. Usually everything after our last
 * message; but a tool's message (their sites, a payment prompt, a payment
 * confirmation) can go out after messages the agent never saw, and those still
 * need an answer:
 * - the last turn finished: what came in while it ran (after the newest message
 *   it saw, before it ended);
 * - the last turn's reply was dropped for newer messages: its whole batch again
 *   (from its first message), even if a tool's message went out after it.
 */

export type Item = { at: Date; from: "them" | "us"; text: string; mediaId?: string };

/** The agent's last turn on this chat, as the "turn" or "superseded" event left it */
export type LastTurn = { kind: "turn"; upTo: Date; endedAt: Date } | { kind: "superseded"; from: Date; endedAt: Date } | null;

export function unanswered(items: Item[], lastTurn: LastTurn) {
  const lastOurs = [...items].reverse().find((item) => item.from === "us");
  const missed = (at: Date) => {
    if (!lastTurn) return false;
    if (lastTurn.kind === "turn") return at > lastTurn.upTo && at <= lastTurn.endedAt;
    return at >= lastTurn.from && at <= lastTurn.endedAt;
  };
  return items.filter((item) => item.from === "them" && (!lastOurs || item.at > lastOurs.at || missed(item.at)));
}

/** The conversation with the messages to answer moved to the end (the model answers what comes last) */
export function withBatchLast(items: Item[], batch: Item[]) {
  return [...items.filter((item) => !batch.includes(item)), ...batch];
}

/** Reads the last turn from its event's data ({ upTo } on a turn, { from } on a dropped reply) */
export function lastTurnFrom(event: { kind: string; data: unknown; createdAt: Date } | null): LastTurn {
  if (!event) return null;
  const data = (event.data ?? {}) as { upTo?: string; from?: string };
  if (event.kind === "turn" && data.upTo) return { kind: "turn", upTo: new Date(data.upTo), endedAt: event.createdAt };
  if (event.kind === "superseded" && data.from) return { kind: "superseded", from: new Date(data.from), endedAt: event.createdAt };
  return null;
}

/**
 * Model text as WhatsApp shows it: *bold* and _italic_ take one mark there
 * (models write Markdown's two), no headings, links as plain addresses.
 */
export function whatsappText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "_$1_")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label: string, url: string) => (label === url ? url : `${label}: ${url}`))
    .trim();
}
