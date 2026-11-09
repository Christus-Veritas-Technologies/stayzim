import { expect, mock, test } from "bun:test";

/**
 * The queue for real (its timers), with a stand-in WhatsApp number and turn:
 * a burst is one turn, and messages during a turn make its reply out of date
 * and get one more turn, all together.
 */

const turns: { at: number; superseded: boolean }[] = [];
let turnMs = 0;

mock.module("../outreach/whatsapp", () => ({ getAccount: () => ({ isReady: true }) }));
mock.module("./settings", () => ({ isAgentAccount: (id: string) => id === "wa1" }));
mock.module("./agent", () => ({
  handleChat: async (account: string, chatId: string) => {
    await new Promise((resolve) => setTimeout(resolve, turnMs));
    const { superseded, answered } = await import("./queue");
    const dropped = superseded(account, chatId);
    if (!dropped) answered(account, chatId);
    turns.push({ at: Date.now(), superseded: dropped });
  },
}));

const { queueAgentTurn } = await import("./queue");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("a burst of messages gets one turn, 5 s after the last", async () => {
  turns.length = 0;
  turnMs = 0;
  const start = Date.now();
  queueAgentTurn("wa1", "a@c.us");
  await wait(2_000);
  queueAgentTurn("wa1", "a@c.us");
  await wait(2_000);
  queueAgentTurn("wa1", "a@c.us");
  await wait(4_000);
  expect(turns).toHaveLength(0);
  await wait(2_000);
  expect(turns).toHaveLength(1);
  expect(turns[0]!.at - start).toBeGreaterThanOrEqual(9_000);
  // Not on an agent number: nothing
  queueAgentTurn("wa3", "b@c.us");
  await wait(6_000);
  expect(turns).toHaveLength(1);
}, 20_000);

test("a message during a turn: its reply is dropped, and one more turn answers everything", async () => {
  turns.length = 0;
  turnMs = 4_000;
  queueAgentTurn("wa1", "c@c.us");
  // The turn starts at 5 s and thinks for 4 s; they write again at 6 s
  await wait(6_000);
  queueAgentTurn("wa1", "c@c.us");
  await wait(4_000);
  expect(turns).toEqual([expect.objectContaining({ superseded: true })]);
  // 6 s + 5 s gap + 4 s thinking
  await wait(6_000);
  expect(turns).toHaveLength(2);
  expect(turns[1]!.superseded).toBe(false);
}, 25_000);
