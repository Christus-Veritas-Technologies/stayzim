/**
 * One real agent turn (handleChat) with OpenRouter and WhatsApp stood in, on
 * the local database: checks what the agent sends the model (no temperature,
 * low reasoning effort, the script marked for caching, its thinking handed back
 * with its tool calls), that the reply reaches the chat in WhatsApp's
 * formatting, that a model failure is tried again, and that a message sent
 * while a tool was sending gets its own answer.
 *
 *   bun scripts/agent-turn-check.ts
 */
import prisma from "@stayzim/db";

process.env.OPENROUTER_API_KEY ||= "stand-in-key-not-real";

const sent: { chatId: string; text: string }[] = [];
const fake = (id: string) => ({
  id,
  isReady: true,
  replyInChat: async (chatId: string, text: string) => {
    sent.push({ chatId, text });
    console.log(`\n--- ${id} → ${chatId} ---\n${text}\n---`);
    return `fake-${sent.length}`;
  },
  markRead: async () => {},
  send: async (_phone: string, text: string) => (console.log(`  [alert] ${text}`), { sent: true }),
  setChatLabel: async () => "set" as const,
  getStatus: () => ({ id, state: "ready" }),
});
const box = globalThis as Record<string, unknown>;
box.__stayzimWhatsApp = { accounts: new Map([["wa1", fake("wa1")], ["wa3", fake("wa3")]]), nextIndex: 0, started: true };
box.__stayzimAgentMode = { mode: "live", at: Date.now() + 24 * 60 * 60 * 1000 };

// OpenRouter stood in: Jev's answers, and a scripted model
type Body = Record<string, any>;
const chatBodies: Body[] = [];
let script: ((body: Body) => Response | Promise<Response>)[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith("https://openrouter.ai")) return realFetch(input, init);
  const body = JSON.parse(String(init?.body ?? "{}")) as Body;
  if (url.endsWith("/alpha/decisions")) {
    const noul = (probability: number) => ({ type: "noul", probability });
    return Response.json({
      decisions: {
        place_to_stay: noul(0.95),
        intent: { type: "choice", selected: "wants a website for their place to stay", probabilities: {}, confidence: 0.9 },
        fit: { type: "score", selected: "operating lodge", probabilities: {}, confidence: 0.8 },
        needs_human: noul(0.02),
        ...(body.questions.photos_of_property ? { photos_of_property: noul(0.9) } : {}),
      },
      usage: { cost: 0.00001 },
    });
  }
  chatBodies.push(body);
  const next = script.shift();
  if (!next) throw new Error("the model was called more often than scripted");
  return next(body);
}) as typeof fetch;

const reply = (content: string) => () => Response.json({ model: "anthropic/claude-haiku-5.5", choices: [{ message: { content }, finish_reason: "stop" }], usage: { cost: 0.0001 } });
const toolCall = (name: string, args: Record<string, unknown>) => () =>
  Response.json({
    model: "anthropic/claude-haiku-5.5",
    choices: [
      {
        message: { content: null, tool_calls: [{ id: `call-${name}`, type: "function", function: { name, arguments: JSON.stringify(args) } }], reasoning_details: [{ type: "reasoning.encrypted", data: "THINKING-1" }] },
        finish_reason: "tool_calls",
      },
    ],
    usage: { cost: 0.0001 },
  });
const failure = () => new Response("upstream error", { status: 502 });

const { handleChat } = await import("../src/server/agent/agent");

const results: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
};

let n = 0;
async function newChat() {
  const phone = `26377${String(Math.floor(Date.now() / 1000) % 100_000).padStart(5, "0")}${String(++n).padStart(2, "0")}`;
  const chatId = `${phone}@c.us`;
  const contact = await prisma.contact.create({ data: { name: `+${phone}`, phone, city: "", source: "whatsapp", agentChatId: chatId, agentAccount: "wa1", agentStage: "NEW" } });
  const write = async (body: string, secondsAgo = 0) =>
    prisma.inboundMessage.create({
      data: { contactId: contact.id, phone, chatId, account: "wa1", body, type: "chat", whatsappMessageId: `turn-${phone}-${Math.random()}`, createdAt: new Date(Date.now() - secondsAgo * 1000) },
    });
  const messages = () => sent.filter((message) => message.chatId === chatId).map((message) => message.text);
  return { contact, chatId, write, messages };
}

// 1. A turn with a tool call, then the reply
{
  const chat = await newChat();
  await chat.write("Hi StayZim, I'd like a website for my lodge. It's Hardy House in Masvingo");
  chatBodies.length = 0;
  script = [toolCall("save_details", { lodge_name: "Hardy House", city: "Masvingo" }), reply("Nice. It's **free to preview for 2 days**, then from $15 a month. Send me 3 to 5 photos?")];
  await handleChat("wa1", chat.chatId);
  const [first, second] = chatBodies;
  check("no temperature sent", chatBodies.every((body) => !("temperature" in body)));
  check("low reasoning effort", chatBodies.every((body) => body.reasoning?.effort === "low"));
  check("room for thinking and the reply", chatBodies.every((body) => body.max_tokens >= 2000));
  const system = first?.messages[0];
  check("the script is cached, the live part after it", Array.isArray(system?.content) && system.content[0].cache_control?.type === "ephemeral" && system.content[1].text.startsWith("# Live facts"));
  check("the script's bytes are the same every round", JSON.stringify(first?.messages[0].content[0]) === JSON.stringify(second?.messages[0].content[0]));
  const handedBack = second?.messages.find((message: Body) => message.role === "assistant" && message.tool_calls);
  check("its thinking goes back with its tool call", JSON.stringify(handedBack?.reasoning_details) === JSON.stringify([{ type: "reasoning.encrypted", data: "THINKING-1" }]));
  check("the reply in WhatsApp's bold", chat.messages().at(-1) === "Nice. It's *free to preview for 2 days*, then from $15 a month. Send me 3 to 5 photos?");
  const saved = await prisma.contact.findUniqueOrThrow({ where: { id: chat.contact.id } });
  check("the tool ran", saved.lodgeName === "Hardy House" && saved.city === "Masvingo");
}

// 2. A message that came in while a tool was sending gets its own answer next turn
{
  const chat = await newChat();
  await chat.write("Hi, Hardy House in Masvingo", 20);
  script = [reply("Thanks. Send me a few photos?")];
  await handleChat("wa1", chat.chatId);
  // The turn ended; now pretend one came in mid-turn: written after the newest message the turn saw, before it ended, and before our reply
  const turn = await prisma.agentEvent.findFirstOrThrow({ where: { contactId: chat.contact.id, kind: "turn" }, orderBy: { createdAt: "desc" } });
  const ours = await prisma.outreachMessage.findFirstOrThrow({ where: { contactId: chat.contact.id }, orderBy: { createdAt: "desc" } });
  await prisma.inboundMessage.create({
    data: { contactId: chat.contact.id, phone: chat.contact.phone, chatId: chat.chatId, account: "wa1", body: "we also have a pool", type: "chat", whatsappMessageId: `mid-${Math.random()}`, createdAt: new Date(ours.createdAt.getTime() - 500) },
  });
  check("turn records what it saw", typeof (turn.data as { upTo?: string }).upTo === "string");
  chatBodies.length = 0;
  script = [reply("A pool is worth showing. Send a photo of it too?")];
  await handleChat("wa1", chat.chatId);
  const lastUser = chatBodies[0]?.messages.at(-1);
  check("the mid-turn message is answered, and is the last thing the model reads", chatBodies.length === 1 && lastUser?.role === "user" && String(lastUser.content).includes("we also have a pool"));
  chatBodies.length = 0;
  await handleChat("wa1", chat.chatId);
  check("and not answered twice", chatBodies.length === 0);
}

// 3. The model fails: tried again a minute later, no reply in the meantime
{
  const chat = await newChat();
  await chat.write("Hi, how much is it?");
  script = [failure];
  await handleChat("wa1", chat.chatId);
  const error = await prisma.agentEvent.findFirst({ where: { contactId: chat.contact.id, kind: "error" } });
  check("a failed model call is logged, nothing sent", Boolean(error) && chat.messages().length === 0);
  check("a retry is scheduled", (globalThis as { __stayzimAgentFailures?: Map<string, { tries: number }> }).__stayzimAgentFailures?.get(`wa1|${chat.chatId}`)?.tries === 1);
  // The retry, run now: answered
  script = [reply("From $15 a month, free to preview for 2 days first. What's your place called?")];
  await handleChat("wa1", chat.chatId);
  check("the retry answers", chat.messages().length === 1);
  check("the failure count resets", !(globalThis as { __stayzimAgentFailures?: Map<string, unknown> }).__stayzimAgentFailures?.has(`wa1|${chat.chatId}`));
}

console.log(`\n${results.filter((result) => result.ok).length}/${results.length} passed`);
process.exit(results.every((result) => result.ok) ? 0 : 1);
