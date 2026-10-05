import prisma from "@stayzim/db";
import { env } from "@stayzim/env/outreach";

import {
  accountIds,
  getAccount,
  markAccountUsed,
  normalizePhone,
  onInboundMessage,
  readyAccountsInRotation,
  type WhatsAppAccount,
} from "./whatsapp";

/** Contacts in these states are picked up by campaigns. */
const SENDABLE_STATUSES = ["PENDING", "FAILED"] as const;

/** Daily limits are a rolling window, so there's no timezone to get wrong. */
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Replies that opt someone out of all further messages. */
const OPT_OUT = /^\s*(stop|unsubscribe|opt[\s-]?out|remove me)\s*[.!]*\s*$/i;

type ContactFields = { name: string; city: string };

/** Fills {name} and {city} in a message template. */
export function renderMessage(template: string, contact: ContactFields | null) {
  if (!contact) return template;
  return template.replaceAll("{name}", contact.name).replaceAll("{city}", contact.city);
}

export class OutreachError extends Error {
  constructor(
    readonly status: 404 | 409 | 429 | 503,
    message: string,
    /** For 429: when the earliest number gets capacity back. */
    readonly retryAt?: Date,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Daily limits
// ---------------------------------------------------------------------------

export type AccountUsage = {
  account: string;
  sent: number;
  limit: number;
  remaining: number;
  /** When the oldest send in the window ages out, freeing one slot. Only set at the limit. */
  resetsAt?: Date;
};

export async function getAccountUsage(accountId: string): Promise<AccountUsage> {
  const since = new Date(Date.now() - LIMIT_WINDOW_MS);
  const where = { account: accountId, status: "SENT" as const, createdAt: { gte: since } };
  const sent = await prisma.outreachMessage.count({ where });
  const usage: AccountUsage = {
    account: accountId,
    sent,
    limit: env.WHATSAPP_DAILY_LIMIT,
    remaining: Math.max(0, env.WHATSAPP_DAILY_LIMIT - sent),
  };

  if (usage.remaining === 0) {
    // The window holds `sent` messages; capacity returns when enough of the oldest age out
    const freeing = await prisma.outreachMessage.findFirst({
      where,
      orderBy: { createdAt: "asc" },
      skip: sent - env.WHATSAPP_DAILY_LIMIT,
      select: { createdAt: true },
    });
    if (freeing) usage.resetsAt = new Date(freeing.createdAt.getTime() + LIMIT_WINDOW_MS);
  }
  return usage;
}

export function getAllAccountUsage() {
  return Promise.all(accountIds.map(getAccountUsage));
}

/** Picks the account to send from, honouring connection state and daily limits. */
async function resolveAccount(accountId: string | undefined): Promise<WhatsAppAccount> {
  if (accountId) {
    const account = getAccount(accountId);
    if (!account) throw new OutreachError(404, `Unknown WhatsApp account: ${accountId}`);
    if (!account.isReady) throw new OutreachError(503, `WhatsApp account ${accountId} is not ready`);

    const usage = await getAccountUsage(accountId);
    if (usage.remaining === 0) {
      throw new OutreachError(429, `WhatsApp account ${accountId} hit its daily limit of ${usage.limit}`, usage.resetsAt);
    }
    return account;
  }

  const ready = readyAccountsInRotation();
  if (ready.length === 0) throw new OutreachError(503, "No WhatsApp account is ready");

  let earliestReset: Date | undefined;
  for (const account of ready) {
    const usage = await getAccountUsage(account.id);
    if (usage.remaining > 0) {
      markAccountUsed(account);
      return account;
    }
    if (usage.resetsAt && (!earliestReset || usage.resetsAt < earliestReset)) earliestReset = usage.resetsAt;
  }
  throw new OutreachError(429, `Every connected number hit its daily limit of ${env.WHATSAPP_DAILY_LIMIT}`, earliestReset);
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export type SendResult = {
  phone: string;
  contactId: string | null;
  account: string;
  status: "SENT" | "NOT_ON_WHATSAPP" | "FAILED";
  messageId?: string;
  whatsappMessageId?: string;
  error?: string;
};

/**
 * Sends one message and records it. If the number belongs to a contact, the
 * contact is marked REACHED — once any of our numbers reaches someone, they
 * count as reached.
 */
export async function sendToPhone(input: { phone: string; message: string; account?: string }): Promise<SendResult> {
  const phone = normalizePhone(input.phone);
  const contact = await prisma.contact.findUnique({ where: { phone } });
  if (contact?.status === "DO_NOT_CONTACT") {
    throw new OutreachError(409, "This contact is marked DO_NOT_CONTACT");
  }

  const account = await resolveAccount(input.account);
  const body = renderMessage(input.message, contact);

  let result: SendResult;
  try {
    const sent = await account.send(phone, body);
    result = sent.sent
      ? { phone, contactId: contact?.id ?? null, account: account.id, status: "SENT", whatsappMessageId: sent.id }
      : { phone, contactId: contact?.id ?? null, account: account.id, status: "NOT_ON_WHATSAPP" };
  } catch (error) {
    result = {
      phone,
      contactId: contact?.id ?? null,
      account: account.id,
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const logged = await prisma.outreachMessage.create({
    data: {
      contactId: result.contactId,
      phone,
      account: account.id,
      body,
      status: result.status,
      whatsappMessageId: result.whatsappMessageId,
      error: result.error,
    },
  });

  if (contact) {
    if (result.status === "SENT") {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          // Someone who already replied stays REPLIED
          status: contact.status === "REPLIED" ? "REPLIED" : "REACHED",
          reachedVia: contact.reachedVia ?? account.id,
          lastContactedAt: new Date(),
        },
      });
    } else if (result.status === "NOT_ON_WHATSAPP") {
      await prisma.contact.update({ where: { id: contact.id }, data: { status: "NOT_ON_WHATSAPP" } });
    } else if (contact.status === "PENDING") {
      // A failed retry never downgrades someone already reached
      await prisma.contact.update({ where: { id: contact.id }, data: { status: "FAILED" } });
    }
  }

  return { ...result, messageId: logged.id };
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

onInboundMessage(async (event) => {
  const contact = event.phone ? await prisma.contact.findUnique({ where: { phone: event.phone } }) : null;

  const { count } = await prisma.inboundMessage.createMany({
    data: {
      contactId: contact?.id,
      phone: event.phone,
      chatId: event.chatId,
      account: event.account,
      body: event.body,
      type: event.type,
      whatsappMessageId: event.whatsappMessageId,
      createdAt: event.receivedAt,
    },
    // WhatsApp can redeliver messages after a reconnect
    skipDuplicates: true,
  });
  if (count === 0 || !contact) return;

  const optOut = OPT_OUT.test(event.body);
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      lastRepliedAt: event.receivedAt,
      // Only a reply to our outreach counts as REPLIED; a lead writing first stays
      // PENDING so campaigns still send them the intro
      ...(optOut
        ? { status: "DO_NOT_CONTACT" as const }
        : contact.status === "REACHED" && { status: "REPLIED" as const }),
    },
  });
  console.log(
    `[outreach] reply from ${contact.name} (+${contact.phone}) to ${event.account}${optOut ? " — opted out" : ""}`,
  );
});

// ---------------------------------------------------------------------------
// Campaigns: send one message to many contacts, one at a time, in the background
// ---------------------------------------------------------------------------

export type CampaignInput = {
  message: string;
  contactIds?: string[];
  phones?: string[];
  city?: string;
  limit?: number;
  account?: string;
  retryFailed?: boolean;
  minDelaySeconds: number;
  maxDelaySeconds: number;
};

export type CampaignState = {
  running: boolean;
  stopRequested: boolean;
  message: string;
  startedAt: string;
  finishedAt?: string;
  stoppedReason?: string;
  total: number;
  processed: number;
  sent: number;
  notOnWhatsapp: number;
  failed: number;
  /** Contacts that were no longer sendable by the time their turn came (e.g. reached by a direct send). */
  skipped: number;
  nextSendAt?: string;
  /** Set while every usable number is at its daily limit; sending resumes after this. */
  pausedUntil?: string;
};

let campaign: CampaignState | undefined;

export function getCampaign() {
  return campaign ? { ...campaign } : null;
}

export function stopCampaign() {
  if (!campaign?.running) throw new OutreachError(409, "No campaign is running");
  campaign.stopRequested = true;
  return getCampaign();
}

export async function startCampaign(input: CampaignInput) {
  if (campaign?.running) throw new OutreachError(409, "A campaign is already running");

  // Fail fast if nothing could ever send. Being at the daily limit is fine: the campaign waits.
  if (input.account ? !getAccount(input.account)?.isReady : readyAccountsInRotation().length === 0) {
    throw new OutreachError(
      input.account && !getAccount(input.account) ? 404 : 503,
      input.account ? `WhatsApp account ${input.account} is not available` : "No WhatsApp account is ready",
    );
  }

  const statuses = input.retryFailed ? [...SENDABLE_STATUSES] : ["PENDING" as const];
  const contacts = await prisma.contact.findMany({
    where: {
      status: { in: statuses },
      ...(input.contactIds && { id: { in: input.contactIds } }),
      ...(input.phones && { phone: { in: input.phones.map(normalizePhone) } }),
      ...(input.city && { city: { equals: input.city, mode: "insensitive" as const } }),
    },
    orderBy: { createdAt: "asc" },
    take: input.limit,
    select: { id: true, phone: true },
  });

  if (contacts.length === 0) throw new OutreachError(409, "No contacts match, or all of them were already reached");

  campaign = {
    running: true,
    stopRequested: false,
    message: input.message,
    startedAt: new Date().toISOString(),
    total: contacts.length,
    processed: 0,
    sent: 0,
    notOnWhatsapp: 0,
    failed: 0,
    skipped: 0,
  };

  void runCampaign(campaign, contacts, input);
  return getCampaign();
}

async function runCampaign(state: CampaignState, contacts: { id: string; phone: string }[], input: CampaignInput) {
  try {
    for (let index = 0; index < contacts.length; ) {
      if (state.stopRequested) {
        state.stoppedReason = "Stopped by request";
        break;
      }
      const { id, phone } = contacts[index]!;

      // Re-check: a direct send, a reply or an edit may have changed it since the campaign started
      const current = await prisma.contact.findUnique({ where: { id }, select: { status: true } });
      if (!current || !(SENDABLE_STATUSES as readonly string[]).includes(current.status)) {
        state.skipped++;
        state.processed++;
        index++;
        continue;
      }

      let result: SendResult;
      try {
        result = await sendToPhone({ phone, message: input.message, account: input.account });
      } catch (error) {
        if (error instanceof OutreachError && error.status === 429) {
          // Every usable number is at its daily limit: wait for capacity, then retry this contact
          const resumeAt = error.retryAt ?? new Date(Date.now() + 15 * 60 * 1000);
          state.pausedUntil = resumeAt.toISOString();
          console.log(`[campaign] daily limits reached; paused until ${state.pausedUntil}`);
          await sleepUnlessStopped(state, Math.max(resumeAt.getTime() - Date.now(), 0) + 5_000);
          state.pausedUntil = undefined;
          continue;
        }
        // No account can send at all (disconnected) — the rest would fail the same way
        state.stoppedReason = error instanceof Error ? error.message : String(error);
        break;
      }

      state.processed++;
      index++;
      if (result.status === "SENT") state.sent++;
      else if (result.status === "NOT_ON_WHATSAPP") state.notOnWhatsapp++;
      else state.failed++;

      if (index < contacts.length) {
        // Randomised gap between messages so the numbers don't look automated
        const delayMs =
          (input.minDelaySeconds + Math.random() * (input.maxDelaySeconds - input.minDelaySeconds)) * 1000;
        state.nextSendAt = new Date(Date.now() + delayMs).toISOString();
        await sleepUnlessStopped(state, delayMs);
        state.nextSendAt = undefined;
      }
    }
  } catch (error) {
    state.stoppedReason = error instanceof Error ? error.message : String(error);
    console.error("[campaign] crashed:", error);
  } finally {
    state.running = false;
    state.nextSendAt = undefined;
    state.pausedUntil = undefined;
    state.finishedAt = new Date().toISOString();
    console.log(
      `[campaign] finished: ${state.sent} sent, ${state.notOnWhatsapp} not on WhatsApp, ${state.failed} failed, ` +
        `${state.skipped} skipped of ${state.total}${state.stoppedReason ? ` (${state.stoppedReason})` : ""}`,
    );
  }
}

/** Sleeps, but wakes early when a stop is requested so /stop takes effect immediately. */
async function sleepUnlessStopped(state: CampaignState, ms: number) {
  const until = Date.now() + ms;
  while (Date.now() < until && !state.stopRequested) {
    await Bun.sleep(Math.min(1000, until - Date.now()));
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const CONTACT_STATUSES = [
  "PENDING",
  "REACHED",
  "REPLIED",
  "NOT_ON_WHATSAPP",
  "FAILED",
  "DO_NOT_CONTACT",
] as const;

export async function getContactStats() {
  const groups = await prisma.contact.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = Object.fromEntries(CONTACT_STATUSES.map((status) => [status, 0])) as Record<
    (typeof CONTACT_STATUSES)[number],
    number
  >;
  for (const group of groups) byStatus[group.status] = group._count._all;
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  return { total, byStatus };
}

export async function getDashboardStats() {
  const since = new Date(Date.now() - LIMIT_WINDOW_MS);

  const [contacts, usage, sent24h, failed24h, sentTotal, replies24h, repliesTotal, recentSent, recentReplies] =
    await Promise.all([
      getContactStats(),
      getAllAccountUsage(),
      prisma.outreachMessage.count({ where: { status: "SENT", createdAt: { gte: since } } }),
      prisma.outreachMessage.count({ where: { status: { not: "SENT" }, createdAt: { gte: since } } }),
      prisma.outreachMessage.count({ where: { status: "SENT" } }),
      prisma.inboundMessage.count({ where: { createdAt: { gte: since } } }),
      prisma.inboundMessage.count(),
      prisma.outreachMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { contact: { select: { name: true } } },
      }),
      prisma.inboundMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { contact: { select: { name: true } } },
      }),
    ]);

  const { REACHED, REPLIED } = contacts.byStatus;
  const replyRate = REACHED + REPLIED > 0 ? REPLIED / (REACHED + REPLIED) : 0;

  return {
    contacts,
    usage,
    sent24h,
    failed24h,
    sentTotal,
    replies24h,
    repliesTotal,
    replyRate,
    recentSent: recentSent.map(
      (message): ActivityRow => ({
        createdAt: message.createdAt,
        contactName: message.contact?.name,
        phone: message.phone,
        account: message.account,
        status: message.status,
      }),
    ),
    recentReplies: recentReplies.map(
      (reply): ActivityRow => ({
        createdAt: reply.createdAt,
        contactName: reply.contact?.name,
        phone: reply.phone,
        account: reply.account,
        body: reply.body,
        type: reply.type,
      }),
    ),
  };
}

export type ActivityRow = {
  createdAt: Date;
  contactName?: string;
  phone: string | null;
  account: string;
  status?: string;
  body?: string;
  type?: string;
};
