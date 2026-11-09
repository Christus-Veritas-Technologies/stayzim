import prisma from "@stayzim/db";
import { env } from "@stayzim/env/admin";

import { alertKin } from "./alerts";
import { logEvent } from "./chat";

/**
 * Brakes on the agent's spending, whatever comes in:
 * - a chat gets at most TURNS_PER_HOUR turns an hour (another bot answering
 *   ours, or someone sending one message a minute); then it's read, not
 *   answered, until the hour is up, and Kin is told once;
 * - all chats together spend at most AGENT_DAILY_BUDGET_USD a day (Harare
 *   time) on the models; then the agent stops for the day and Kin is told once.
 */

export const TURNS_PER_HOUR = 15;

/** Midnight in Harare (UTC+2, no daylight saving) before `now` */
export function harareDayStart(now: Date) {
  const harare = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  harare.setUTCHours(0, 0, 0, 0);
  return new Date(harare.getTime() - 2 * 60 * 60 * 1000);
}

/** What the models cost today, in US dollars */
export async function spentToday(now = new Date()) {
  const total = await prisma.agentEvent.aggregate({ where: { createdAt: { gte: harareDayStart(now) } }, _sum: { costUsd: true } });
  return total._sum.costUsd ?? 0;
}

/** Over today's budget: true (and Kin is told, once a day). */
export async function overDailyBudget(now = new Date()) {
  const spent = await spentToday(now);
  if (spent < env.AGENT_DAILY_BUDGET_USD) return false;
  const told = await prisma.agentEvent.count({ where: { kind: "limit", createdAt: { gte: harareDayStart(now) }, data: { path: ["reason"], equals: "daily budget" } } });
  if (!told) {
    await logEvent({ contactId: null, chatId: "-", account: "-", kind: "limit", data: { reason: "daily budget", spent, budget: env.AGENT_DAILY_BUDGET_USD } });
    await alertKin(`Today's budget is used up ($${spent.toFixed(2)} of $${env.AGENT_DAILY_BUDGET_USD}): the agent stops answering until midnight. New messages wait on wa1 for you.`);
  }
  return true;
}

/** This chat had TURNS_PER_HOUR turns in the last hour: true (and Kin is told, once an hour). */
export async function tooManyTurns(contact: { id: string; name: string; phone: string; lodgeName: string | null }, chatId: string, account: string) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const turns = await prisma.agentEvent.count({ where: { contactId: contact.id, kind: "turn", createdAt: { gte: hourAgo } } });
  if (turns < TURNS_PER_HOUR) return false;
  const told = await prisma.agentEvent.count({ where: { contactId: contact.id, kind: "limit", createdAt: { gte: hourAgo } } });
  if (!told) {
    await logEvent({ contactId: contact.id, chatId, account, kind: "limit", data: { reason: "turns per hour", turns } });
    await alertKin(`${contact.lodgeName ?? contact.name} (+${contact.phone}) had ${turns} answers in an hour: the agent pauses there for the rest of the hour. Is it a bot, or do they need you?`);
  }
  return true;
}
