import prisma from "@stayzim/db";

import { alertKin } from "./alerts";
import { logEvent, sendInChat } from "./chat";
import { labelChat } from "./labels";
import { serverApi, type LinkPayment, type LinkStatus } from "./server-api";
import { paidMessage, paymentFailedMessage, promptNudgeMessage } from "./templates";

/**
 * Watches what the agent sent someone to pay with: a payment link, and the
 * prompt on their phone when it sent one. Everything goes through the link
 * (the prompt is a payment on it), so a payment shows up however they pay:
 * the prompt, or the link with EcoCash, OneMoney, InnBucks or a card.
 *
 * - Paid: their site, the claim link and next steps in the chat right away,
 *   the ads' label, and Kin alerted. Once, however many checks see it.
 * - Their prompt failed or was cancelled: told so, with the link to pay
 *   instead (and the offer to send it again). Kin alerted.
 * - Their prompt still waiting after 2 minutes (it times out on the phone,
 *   often without a word from Paynow): one message offering to send it again,
 *   with the link. Not when they've written since (the agent is on it).
 *
 * Checks every 5 s for the first 2 minutes, then every 15 s, for 20 minutes;
 * after that (or after a redeploy) the agent's minute loop checks every link
 * sent in the last 14 days that isn't paid (sweepPayments).
 */

export const NUDGE_AFTER_MS = 2 * 60 * 1000;
const FAST_MS = 5_000;
const SLOW_MS = 15_000;
export const WATCH_MS = 20 * 60 * 1000;
/** As long as a payment link works */
const SWEEP_DAYS = 14;

export type PaymentWatch = {
  contactId: string;
  chatId: string;
  account: string;
  token: string;
  slug: string;
  /** The prompt the agent sent on this link; none when it sent only the link */
  paymentId?: string | null;
  /** When the prompt or the link went out */
  sentAt: number;
};

export type Step =
  | { kind: "paid"; payment: LinkPayment | null }
  | { kind: "failed"; payment: LinkPayment }
  | { kind: "nudge" }
  | { kind: "wait" }
  | { kind: "stop" };

/** What to do about a link as it stands (pure: the rules, unit-tested). */
export function nextStep(watch: Pick<PaymentWatch, "paymentId" | "sentAt">, status: LinkStatus, now: number, done: { failed: boolean; nudged: boolean }): Step {
  if (status.link.state === "paid") return { kind: "paid", payment: status.payments.find((payment) => payment.status === "PAID") ?? null };
  if (status.link.state === "expired") return { kind: "stop" };
  const prompt = watch.paymentId ? status.payments.find((payment) => payment.id === watch.paymentId) : undefined;
  if (!prompt) return { kind: "wait" };
  if (prompt.status === "FAILED" || prompt.status === "CANCELLED") return done.failed ? { kind: "wait" } : { kind: "failed", payment: prompt };
  // Within the watch only: a prompt Paynow never settled isn't brought up days later
  const age = now - watch.sentAt;
  if (prompt.status === "PENDING" && age >= NUDGE_AFTER_MS && age <= WATCH_MS && !done.nudged && !done.failed) return { kind: "nudge" };
  return { kind: "wait" };
}

type Box = { __stayzimPaymentWatch?: Map<string, { watch: PaymentWatch; timer: ReturnType<typeof setTimeout> | null }>; __stayzimPaymentChecking?: Set<string> };
const box = globalThis as unknown as Box;
// An older version kept intervals by payment id here: start clean
if (box.__stayzimPaymentWatch && [...box.__stayzimPaymentWatch.values()].some((value) => !value || typeof value !== "object" || !("watch" in value))) box.__stayzimPaymentWatch = new Map();
const watching = (box.__stayzimPaymentWatch ??= new Map());
/** Links being checked right now: never two checks of one link at once (no double messages) */
const checking = (box.__stayzimPaymentChecking ??= new Set());

/** Starts (or restarts, for a new prompt on the same link) watching a link. */
export function watchPayment(watch: PaymentWatch) {
  const current = watching.get(watch.token);
  if (current?.timer) clearTimeout(current.timer);
  watching.set(watch.token, { watch, timer: null });
  schedule(watch.token, FAST_MS);
}

function schedule(token: string, delay: number) {
  const entry = watching.get(token);
  if (!entry) return;
  const timer = setTimeout(() => {
    void checkPayment(entry.watch)
      .then((step) => {
        if (watching.get(token) !== entry) return; // a newer watch took over
        const elapsed = Date.now() - entry.watch.sentAt;
        if (step.kind === "paid" || step.kind === "stop" || elapsed > WATCH_MS) watching.delete(token);
        else schedule(token, elapsed < NUDGE_AFTER_MS ? FAST_MS : SLOW_MS);
      })
      .catch((error: unknown) => {
        console.error("[agent] payment check failed:", error);
        if (watching.get(token) === entry && Date.now() - entry.watch.sentAt <= WATCH_MS) schedule(token, SLOW_MS);
        else if (watching.get(token) === entry) watching.delete(token);
      });
  }, delay);
  timer.unref?.();
  entry.timer = timer;
}

/** Whether this prompt's failure or nudge was already sent (also before a restart) */
async function sentAlready(contactId: string, paymentId: string | null | undefined) {
  if (!paymentId) return { failed: false, nudged: false };
  const events = await prisma.agentEvent.findMany({
    where: { contactId, kind: { in: ["payment_failed", "payment_nudge"] }, data: { path: ["paymentId"], equals: paymentId } },
    select: { kind: true },
  });
  return { failed: events.some((event) => event.kind === "payment_failed"), nudged: events.some((event) => event.kind === "payment_nudge") };
}

/**
 * Checks a link once and acts on it (the message, the stage, Kin). Returns
 * what it found; "wait" when another check of the same link is running.
 */
export async function checkPayment(watch: PaymentWatch, { fresh = false } = {}): Promise<Step> {
  // They just said they've paid: wait for a check already running rather than skip
  if (fresh) for (let i = 0; i < 40 && checking.has(watch.token); i++) await new Promise((resolve) => setTimeout(resolve, 250));
  if (checking.has(watch.token)) return { kind: "wait" };
  checking.add(watch.token);
  try {
    const status = await serverApi.linkStatus(watch.token, fresh);
    const step = nextStep(watch, status, Date.now(), await sentAlready(watch.contactId, watch.paymentId));
    if (step.kind === "paid") await onPaid(watch, status, step.payment);
    if (step.kind === "failed") await onFailed(watch, status, step.payment);
    if (step.kind === "nudge") await onStillWaiting(watch, status);
    return step;
  } finally {
    checking.delete(watch.token);
  }
}

async function onPaid(watch: PaymentWatch, status: LinkStatus, payment: LinkPayment | null) {
  // Only the first check to see it says so
  const claimed = await prisma.contact.updateMany({ where: { id: watch.contactId, agentStage: { not: "PAID" } }, data: { agentStage: "PAID", nextFollowUpAt: null } });
  if (claimed.count === 0) return;
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: watch.contactId } });
  const amountCents = payment?.amountCents ?? status.link.amountCents;
  const claim = await serverApi.claimLink(contact.id, watch.slug).catch(() => null);
  await sendInChat({
    contactId: contact.id,
    chatId: watch.chatId,
    account: watch.account,
    text: claim
      ? paidMessage({ lodge: contact.lodgeName ?? status.link.lodgeName, siteUrl: status.link.siteUrl, claimUrl: claim.url, paidUntil: status.link.paidUntil })
      : `Paid, thank you! Your website is live: ${status.link.siteUrl}/`,
  }).catch((error: unknown) => logEvent({ contactId: contact.id, chatId: watch.chatId, account: watch.account, kind: "error", data: { step: "paid message", error: String(error) } }));
  await logEvent({
    contactId: contact.id,
    chatId: watch.chatId,
    account: watch.account,
    kind: "paid",
    data: { slug: watch.slug, token: watch.token, amountCents, receipt: payment?.receiptNumber ?? null, channel: payment?.channelName ?? null },
  });
  await labelChat(contact.id);
  await alertKin(
    `PAID: ${contact.lodgeName ?? contact.name} paid $${(amountCents / 100).toFixed(2)}${payment ? ` by ${payment.channelName}` : ""} (${payment?.receiptNumber ?? "receipt pending"}), ${status.link.siteUrl}`,
  );
}

async function onFailed(watch: PaymentWatch, status: LinkStatus, payment: LinkPayment) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: watch.contactId } });
  // Recorded first, so a second check (or a restart) never says it twice
  await logEvent({ contactId: contact.id, chatId: watch.chatId, account: watch.account, kind: "payment_failed", data: { paymentId: payment.id, status: payment.status, channel: payment.channelName } });
  await prisma.contact.updateMany({ where: { id: contact.id, agentStage: "PAYING" }, data: { agentStage: "CHOSEN" } });
  if (!contact.agentPaused) {
    await sendInChat({ contactId: contact.id, chatId: watch.chatId, account: watch.account, text: paymentFailedMessage(status.link.url) });
  }
  await alertKin(`${payment.channelName} prompt ${payment.status.toLowerCase()} for ${contact.lodgeName ?? contact.name} (+${contact.phone})${contact.agentPaused ? "; the agent is paused here, so they weren't told" : "; they were sent the link to pay instead"}.`);
}

async function onStillWaiting(watch: PaymentWatch, status: LinkStatus) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: watch.contactId } });
  await logEvent({ contactId: contact.id, chatId: watch.chatId, account: watch.account, kind: "payment_nudge", data: { paymentId: watch.paymentId } });
  // They wrote since (the agent answers that), or the team took over: no nudge
  const wroteSince = await prisma.inboundMessage.count({ where: { contactId: contact.id, createdAt: { gt: new Date(watch.sentAt) } } });
  if (wroteSince || contact.agentPaused) return;
  await sendInChat({ contactId: contact.id, chatId: watch.chatId, account: watch.account, text: promptNudgeMessage(status.link.url) });
}

/** The latest link the agent sent this lead (with its prompt, if any), as a watch; null when none. */
export async function latestPaymentWatch(contactId: string): Promise<PaymentWatch | null> {
  const last = await prisma.agentEvent.findFirst({ where: { contactId, kind: { in: ["payment", "payment_link"] } }, orderBy: { createdAt: "desc" } });
  if (!last) return null;
  const data = last.data as { token?: string; slug?: string; paymentId?: string };
  if (!data.token || !data.slug) return null;
  return {
    contactId,
    chatId: last.chatId,
    account: last.account,
    token: data.token,
    slug: data.slug,
    paymentId: last.kind === "payment" ? (data.paymentId ?? null) : null,
    sentAt: last.createdAt.getTime(),
  };
}

/**
 * Every minute (the agent's loop, live mode): each lead with a link from the
 * last 14 days who hasn't paid, and whose link isn't being watched right now,
 * is checked. Covers payments made long after the link went out, and watches
 * a redeploy cut short.
 */
export async function sweepPayments() {
  const since = new Date(Date.now() - SWEEP_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.agentEvent.findMany({
    where: { kind: { in: ["payment", "payment_link"] }, createdAt: { gte: since }, contactId: { not: null }, contact: { agentStage: { not: "PAID" } } },
    distinct: ["contactId"],
    select: { contactId: true },
    take: 200,
  });
  for (const { contactId } of recent) {
    const watch = await latestPaymentWatch(contactId!);
    if (!watch || watching.has(watch.token)) continue;
    await checkPayment(watch).catch((error: unknown) => console.error(`[agent] payment sweep for ${contactId} failed:`, error));
  }
}
