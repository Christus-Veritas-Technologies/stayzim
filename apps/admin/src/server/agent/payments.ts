import prisma from "@stayzim/db";

import { alertKin } from "./alerts";
import { logEvent, sendInChat } from "./chat";
import { serverApi } from "./server-api";
import { paidMessage, paymentFailedMessage } from "./templates";

/**
 * Watches an EcoCash prompt the agent sent: every 10 s for 5 minutes. Paid:
 * their site, the claim link and Kin alerted. Failed or cancelled: offer to try
 * again. Still waiting after 5 minutes: the follow-up loop keeps checking.
 */

const EVERY_MS = 10_000;
const FOR_MS = 5 * 60 * 1000;

type Watch = { contactId: string; chatId: string; account: string; token: string; paymentId: string; slug: string };

const box = globalThis as unknown as { __stayzimPaymentWatch?: Map<string, ReturnType<typeof setInterval>> };
const watching = (box.__stayzimPaymentWatch ??= new Map());

export function watchPayment(watch: Watch) {
  if (watching.has(watch.paymentId)) return;
  const startedAt = Date.now();
  const stop = () => {
    clearInterval(watching.get(watch.paymentId));
    watching.delete(watch.paymentId);
  };
  const timer = setInterval(() => {
    void checkPayment(watch)
      .then((done) => {
        if (done || Date.now() - startedAt > FOR_MS) stop();
      })
      .catch((error: unknown) => console.error("[agent] payment check failed:", error));
  }, EVERY_MS);
  timer.unref?.();
  watching.set(watch.paymentId, timer);
}

/** Checks once; true when the payment is settled (paid, failed or cancelled). */
export async function checkPayment(watch: Watch): Promise<boolean> {
  const status = await serverApi.paymentStatus(watch.token, watch.paymentId);
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: watch.contactId } });
  if (status.payment.status === "PAID") {
    if (contact.agentStage === "PAID") return true;
    await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "PAID", nextFollowUpAt: null } });
    const claim = await serverApi.claimLink(contact.id, watch.slug).catch(() => null);
    await sendInChat({
      contactId: contact.id,
      chatId: watch.chatId,
      account: watch.account,
      text: claim
        ? paidMessage({ lodge: contact.lodgeName ?? "Your lodge", siteUrl: status.link.siteUrl, claimUrl: claim.url, paidUntil: status.link.paidUntil })
        : `Paid, thank you! Your website is live: ${status.link.siteUrl}/`,
    });
    await logEvent({ contactId: contact.id, chatId: watch.chatId, account: watch.account, kind: "paid", data: { slug: watch.slug, amountCents: status.payment.amountCents, receipt: status.payment.receiptNumber } });
    await alertKin(`PAID: ${contact.lodgeName ?? contact.name} paid $${(status.payment.amountCents / 100).toFixed(2)} (${status.payment.receiptNumber ?? "receipt pending"}), ${status.link.siteUrl}`);
    return true;
  }
  if (status.payment.status === "FAILED" || status.payment.status === "CANCELLED") {
    if (contact.agentStage !== "PAYING") return true;
    await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "CHOSEN" } });
    await sendInChat({ contactId: contact.id, chatId: watch.chatId, account: watch.account, text: paymentFailedMessage() });
    await alertKin(`Payment ${status.payment.status.toLowerCase()} for ${contact.lodgeName ?? contact.name} (+${contact.phone}).`);
    return true;
  }
  return false;
}
