/**
 * The sales agent's payments end to end, against the local API and the Paynow
 * stand-in (scripts/paynow-standin.ts), with stand-in WhatsApp numbers that
 * print what they'd send: a prompt that's paid, one that's cancelled, one that
 * times out (the nudge, then paid later, found by the minute sweep after a
 * "restart"), Paynow refusing (the link instead), a number with no wallet,
 * OneMoney, a link paid by card, and "I've paid" checked on the spot.
 *
 *   bun scripts/agent-payments-check.ts
 */
import prisma from "@stayzim/db";

// Stand-in WhatsApp numbers (wa1 the agent's, wa3 for alerts to Kin), and live mode, before the agent's modules load
const sent: { chatId: string; text: string; at: number }[] = [];
const alerts: string[] = [];
const fake = (id: string) => ({
  id,
  isReady: true,
  replyInChat: async (chatId: string, text: string) => {
    sent.push({ chatId, text, at: Date.now() });
    console.log(`\n--- ${id} → ${chatId} ---\n${text}\n---`);
    return `fake-${sent.length}`;
  },
  send: async (_phone: string, text: string) => {
    alerts.push(text);
    console.log(`  [alert] ${text}`);
    return { sent: true };
  },
  setChatLabel: async () => "set" as const,
  getStatus: () => ({ id, state: "ready" }),
});
const box = globalThis as Record<string, unknown>;
box.__stayzimWhatsApp = { accounts: new Map([["wa1", fake("wa1")], ["wa3", fake("wa3")]]), nextIndex: 0, started: true };
box.__stayzimAgentMode = { mode: "live", at: Date.now() + 24 * 60 * 60 * 1000 };

const { runTool } = await import("../src/server/agent/tools");
const { sweepPayments } = await import("../src/server/agent/payments");
const { serverApi } = await import("../src/server/agent/server-api");
type ToolContext = import("../src/server/agent/tools").ToolContext;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const results: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
};

let leads = 0;

/** A lead on wa1 with one site, chosen (as after choose_site) */
async function newLead(label: string) {
  // A number of its own (leads are made at the same moment, and one number is one lead)
  const phone = `26377${String(Math.floor(Date.now() / 1000) % 100_000).padStart(5, "0")}${String(++leads).padStart(2, "0")}`;
  const made = await serverApi.makeSites({ name: `Pay Test ${label}`, town: "Masvingo", whatsapp: phone, plans: ["GROWTH"], previewDays: 2 });
  const site = await prisma.lodge.findUniqueOrThrow({ where: { slug: made.sites[0]!.slug } });
  const chatId = `${phone}@c.us`;
  await prisma.contact.update({
    where: { id: made.leadId },
    data: { agentChatId: chatId, agentAccount: "wa1", agentStage: "CHOSEN", chosenSiteId: site.id, lodgeName: `Pay Test ${label}`, source: "whatsapp" },
  });
  const ctx: ToolContext = {
    contactId: made.leadId,
    chatId,
    account: "wa1",
    send: async (text) => {
      const { sendInChat } = await import("../src/server/agent/chat");
      await sendInChat({ contactId: made.leadId, chatId, account: "wa1", text });
    },
    log: async (kind, data) => {
      await prisma.agentEvent.create({ data: { contactId: made.leadId, chatId, account: "wa1", kind, data: data as object } });
    },
  };
  const tool = async (name: string, args: Record<string, unknown> = {}) => {
    ctx.done = undefined;
    const result = await runTool(name, args, ctx);
    console.log(`\n[${label} · ${name}] ${result}`);
    return result;
  };
  const messages = () => sent.filter((message) => message.chatId === chatId).map((message) => message.text);
  const stage = async () => (await prisma.contact.findUniqueOrThrow({ where: { id: made.leadId } })).agentStage;
  return { contactId: made.leadId, chatId, slug: site.slug, tool, messages, stage };
}

async function lastLinkToken(contactId: string) {
  const event = await prisma.agentEvent.findFirst({ where: { contactId, kind: { in: ["payment", "payment_link"] } }, orderBy: { createdAt: "desc" } });
  return (event?.data as { token: string }).token;
}

const paidCount = (messages: string[]) => messages.filter((text) => text.startsWith("Paid, thank you")).length;

// A: EcoCash prompt, paid: confirmed in the chat with nobody asking
async function paidPrompt() {
  const lead = await newLead("A");
  await lead.tool("start_ecocash", { phone: "077 111 1111" });
  check("A prompt sent", lead.messages().some((text) => text.includes("EcoCash PIN")));
  await wait(15_000);
  check("A paid, confirmed on its own", paidCount(lead.messages()) === 1 && (await lead.stage()) === "PAID", lead.messages().at(-1)?.slice(0, 60));
  check("A claim link in the confirmation", lead.messages().some((text) => text.includes("/claim/") || text.includes("add your email")));
  check("A Kin alerted", alerts.some((text) => text.includes("PAID: Pay Test A")));
  const again = await lead.tool("start_ecocash", { phone: "0771111111" });
  check("A no second prompt once paid", again.includes("paid already"));
  await lead.tool("check_payment");
  check("A confirmed once, however many checks", paidCount(lead.messages()) === 1);
}

// B: cancelled, told with the link; they pay on the link (card): confirmed
async function cancelledThenLink() {
  const lead = await newLead("B");
  await lead.tool("start_ecocash", { phone: "0782222222" });
  await wait(14_000);
  const token = await lastLinkToken(lead.contactId);
  check("B told it didn't go through, with the link", lead.messages().some((text) => text.startsWith("That one didn't go through") && text.includes(token)));
  check("B back to chosen", (await lead.stage()) === "CHOSEN");
  await lead.tool("send_payment_link");
  check("B same link reused", (await lastLinkToken(lead.contactId)) === token);
  // They open it and pay on Paynow's page
  const web = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:9998"}/api/pay/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:9999" },
    body: JSON.stringify({ channel: "web" }),
  }).then((response) => response.json() as Promise<{ payment: { reference: string } }>);
  await fetch(`http://localhost:9977/control/paid?ref=${web.payment.reference}`);
  await wait(17_000);
  check("B paid on the link, confirmed on its own", paidCount(lead.messages()) === 1 && (await lead.stage()) === "PAID");
}

// C: the prompt times out (Paynow says nothing): nudge at 2 minutes; then paid while nobody watches (a restart): the sweep confirms
async function timedOut() {
  const lead = await newLead("C");
  await lead.tool("start_ecocash", { phone: "0774444444" });
  await wait(30_000);
  const pending = await lead.tool("check_payment");
  check("C 'I've paid' while it waits: still waiting", pending.startsWith("Not paid yet: Paynow is still waiting"));
  await wait(100_000);
  const token = await lastLinkToken(lead.contactId);
  check("C nudged once after 2 minutes, with the link", lead.messages().filter((text) => text.startsWith("I haven't seen the payment")).length === 1 && lead.messages().some((text) => text.includes(token)));
  // A redeploy: the watch is gone. They approve late; the minute sweep finds it
  (globalThis as { __stayzimPaymentWatch?: Map<string, { timer: ReturnType<typeof setTimeout> | null }> }).__stayzimPaymentWatch?.forEach((entry) => entry.timer && clearTimeout(entry.timer));
  (globalThis as { __stayzimPaymentWatch?: Map<string, unknown> }).__stayzimPaymentWatch?.clear();
  const status = await serverApi.linkStatus(token);
  await fetch(`http://localhost:9977/control/paid?ref=${status.payments[0]!.reference}`);
  await wait(6_000);
  await Promise.all([sweepPayments(), sweepPayments()]);
  check("C paid late, found by the sweep, confirmed once", paidCount(lead.messages()) === 1 && (await lead.stage()) === "PAID");
}

// D: Paynow refuses the prompt: the link, right away, in the same turn
async function refused() {
  const lead = await newLead("D");
  const result = await lead.tool("start_ecocash", { phone: "0775555555" });
  check("D link sent instead", result.includes("sent the payment link instead") && lead.messages().some((text) => text.startsWith("The payment prompt didn't go through")));
  check("D paying", (await lead.stage()) === "PAYING");
}

// E: a number no wallet can prompt (Telecel 073): the link
async function noWallet() {
  const lead = await newLead("E");
  await lead.tool("start_ecocash", { phone: "0731234567" });
  check("E link for a number with no prompt", lead.messages().some((text) => text.startsWith("I can't send a payment prompt to that number")));
  const bad = await lead.tool("start_ecocash", { phone: "12345" });
  check("E not a number: asked to check", bad.startsWith("That doesn't look like"));
}

// F: OneMoney (071), paid; and "I've paid" right after: confirmed on the spot by check_payment
async function oneMoney() {
  const lead = await newLead("F");
  await lead.tool("start_ecocash", { phone: "0711111111" });
  check("F OneMoney prompt", lead.messages().some((text) => text.includes("OneMoney PIN")));
  await wait(7_000);
  const result = await lead.tool("check_payment");
  check("F 'I've paid': confirmed then and there", result.startsWith("Paid") && paidCount(lead.messages()) === 1);
  await wait(6_000);
  check("F still confirmed once", paidCount(lead.messages()) === 1);
}

await Promise.all([paidPrompt(), cancelledThenLink(), timedOut(), refused(), noWallet(), oneMoney()]);

console.log(`\n${results.filter((result) => result.ok).length}/${results.length} passed`);
for (const result of results.filter((result) => !result.ok)) console.log(`FAILED: ${result.name} ${result.detail}`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
