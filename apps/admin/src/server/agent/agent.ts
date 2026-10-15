import prisma from "@stayzim/db";
import sharp from "sharp";

import { getAccount } from "../outreach/whatsapp";
import { alertKin } from "./alerts";
import { logEvent, sendInChat } from "./chat";
import { chat, decide, type ChatContent, type ChatMessage } from "./openrouter";
import { gate, qualificationQuestions, qualificationState, toQualification, type Qualification } from "./qualify";
import { buildInstructions } from "./script";
import { getAgentMode } from "./settings";
import { givenName, leadSites, readFacts, runTool, TOOLS, type ToolContext } from "./tools";
import { handoverMessage } from "./templates";

/**
 * One turn of the WhatsApp sales agent for a chat on its number: the messages
 * they sent since our last reply, qualified by Jev (ignored chats get blue
 * ticks and no reply), then a reply from the conversation model with its tools.
 * Shadow mode stops after qualifying and logs what it would have done.
 */

/** Tool rounds per turn at most */
const MAX_ROUNDS = 6;
/** Messages of the conversation the model sees */
const HISTORY = 30;
/** Photos from this batch the models see (Jev gets fewer: images slow it down) */
const PHOTOS_FOR_CHAT = 6;
const PHOTOS_FOR_JEV = 3;

type Item = { at: Date; from: "them" | "us"; text: string; mediaId?: string };

/** The conversation with this lead, oldest first: their messages and everything we sent. */
async function conversation(contact: { id: string; phone: string }): Promise<Item[]> {
  const [inbound, outbound] = await Promise.all([
    prisma.inboundMessage.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY,
      select: { createdAt: true, body: true, type: true, media: { select: { id: true } } },
    }),
    prisma.outreachMessage.findMany({
      where: { phone: contact.phone, status: "SENT" },
      orderBy: { createdAt: "desc" },
      take: HISTORY,
      select: { createdAt: true, body: true },
    }),
  ]);
  const items: Item[] = [
    ...inbound.map((m) => ({
      at: m.createdAt,
      from: "them" as const,
      text: m.body || (m.type === "image" ? "[a photo]" : m.type === "ptt" || m.type === "audio" ? "[a voice note]" : `[a ${m.type} message]`),
      mediaId: m.media?.id,
    })),
    ...outbound.map((m) => ({ at: m.createdAt, from: "us" as const, text: m.body })),
  ];
  return items.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(-HISTORY);
}

/** A photo they sent, smaller, as a data URL for the models. */
async function photoUrl(mediaId: string, edge: number) {
  const media = await prisma.inboundMedia.findUnique({ where: { id: mediaId }, select: { data: true } });
  if (!media) return null;
  const jpeg = await sharp(media.data).rotate().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer().catch(() => null);
  return jpeg ? `data:image/jpeg;base64,${jpeg.toString("base64")}` : null;
}

/** The lead talking in this chat (made when they first messaged; see outreach.ts). */
async function leadForChat(account: string, chatId: string) {
  const byChat = await prisma.contact.findFirst({ where: { agentChatId: chatId } });
  if (byChat) return byChat;
  const inbound = await prisma.inboundMessage.findFirst({ where: { chatId, account, contactId: { not: null } }, orderBy: { createdAt: "desc" }, select: { contactId: true } });
  return inbound?.contactId ? prisma.contact.findUnique({ where: { id: inbound.contactId } }) : null;
}

type Lead = NonNullable<Awaited<ReturnType<typeof leadForChat>>>;

/** The system prompt (script, live facts, this lead) and the conversation, with this batch's photos. */
async function chatMessages(contact: Lead, items: Item[], batchPhotos: string[]): Promise<ChatMessage[]> {
  const sites = await leadSites(contact.id);
  const facts = readFacts(contact.qualification);
  const photos = await prisma.inboundMedia.count({ where: { inboundMessage: { contactId: contact.id } } });
  const lastPayment = await prisma.agentEvent.findFirst({ where: { contactId: contact.id, kind: { in: ["payment", "paid"] } }, orderBy: { createdAt: "desc" } });
  const system = buildInstructions(
    {
      stage: contact.agentStage,
      whatsappName: contact.source === "whatsapp" && !facts.nameGiven ? contact.name : null,
      name: givenName(contact),
      lodgeName: contact.lodgeName,
      city: contact.city || null,
      email: contact.email,
      kind: facts.kind ?? null,
      rooms: facts.rooms ?? null,
      photos,
      sites: sites.map((site) => ({ option: site.option, plan: site.plan, monthlyPrice: site.monthlyPrice, url: site.url })),
      chosen: sites.find((site) => site.id === contact.chosenSiteId) ? `option ${sites.find((site) => site.id === contact.chosenSiteId)!.option}` : null,
      payment: lastPayment ? (lastPayment.kind === "paid" ? "paid" : "EcoCash prompt sent, waiting for Paynow") : null,
      notes: contact.notes,
    },
    new Date(),
    !items.some((item) => item.from === "us"),
  );

  // Earlier messages as text; this batch's photos as images on the last message
  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const item of items) {
    const role = item.from === "us" ? "assistant" : "user";
    const last = messages.at(-1);
    if (last && last.role === role && typeof last.content === "string") last.content = `${last.content}\n${item.text}`;
    else messages.push(role === "assistant" ? { role, content: item.text } : { role, content: item.text });
  }
  // The model expects the other person to speak first; our campaign message may have
  if (messages[1]?.role === "assistant") messages.splice(1, 0, { role: "user", content: "(We messaged them first. Our message follows.)" });
  const images = (await Promise.all(batchPhotos.slice(0, PHOTOS_FOR_CHAT).map((id) => photoUrl(id, 1024)))).filter((url): url is string => Boolean(url));
  const lastUser = messages.at(-1);
  if (images.length && lastUser?.role === "user") {
    const content: ChatContent = [{ type: "text", text: typeof lastUser.content === "string" ? lastUser.content : "" }, ...images.map((url) => ({ type: "image_url" as const, image_url: { url } }))];
    lastUser.content = content;
  }

  return messages;
}

export async function handleChat(account: string, chatId: string) {
  const mode = await getAgentMode();
  if (mode === "off") return;
  const number = getAccount(account);
  const contact = await leadForChat(account, chatId);
  if (!contact) {
    await logEvent({ contactId: null, chatId, account, kind: "error", data: { error: "no lead for this chat (WhatsApp hid their number)" } });
    return;
  }
  const event = (kind: string, data: Record<string, unknown>, costUsd = 0) => logEvent({ contactId: contact.id, chatId, account, kind, data, costUsd });

  // Asked to stop, not a fit, or the team has the chat: read, never answered
  if (contact.status === "DO_NOT_CONTACT" || contact.agentStage === "DISQUALIFIED") {
    if (mode === "live") await number?.markRead(chatId);
    return;
  }
  if (contact.agentPaused || contact.agentStage === "HANDOVER") return;

  // What they sent since our last message
  const items = await conversation(contact);
  const lastOurs = [...items].reverse().find((item) => item.from === "us");
  const batch = items.filter((item) => item.from === "them" && (!lastOurs || item.at > lastOurs.at));
  if (batch.length === 0) return;
  // They answered: no follow-up needed
  if (contact.nextFollowUpAt) await prisma.contact.update({ where: { id: contact.id }, data: { nextFollowUpAt: null } });

  const transcript = items.map((item) => `${item.from === "us" ? "StayZim" : "Them"}: ${item.text}`).join("\n");
  const batchPhotos = batch.flatMap((item) => (item.mediaId ? [item.mediaId] : []));

  // --- Qualification (Jev) -------------------------------------------------
  let qualification: Qualification | null = null;
  try {
    const photos = (await Promise.all(batchPhotos.slice(0, PHOTOS_FOR_JEV).map((id) => photoUrl(id, 512)))).filter((url): url is string => Boolean(url));
    const { answers, cost } = await decide(qualificationState(transcript, photos), qualificationQuestions(photos.length > 0));
    qualification = toQualification(answers);
    const previous = (contact.qualification as { jev?: Qualification } | null)?.jev ?? null;
    const decision = gate(qualification, previous, contact.agentStage);
    await prisma.contact.update({
      where: { id: contact.id },
      data: { qualification: { ...((contact.qualification as object | null) ?? {}), jev: qualification } },
    });
    await event("decision", { mode, decision, qualification, batch: batch.map((item) => item.text) }, cost);
    if (mode === "shadow") return;

    if (decision.action === "ignore") {
      await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "DISQUALIFIED", disqualifiedReason: decision.reason } });
      await number?.markRead(chatId);
      return;
    }
    if (decision.action === "stop") {
      await prisma.contact.update({ where: { id: contact.id }, data: { status: "DO_NOT_CONTACT", nextFollowUpAt: null } });
      await number?.markRead(chatId);
      return;
    }
    if (decision.action === "handover") {
      await prisma.contact.update({ where: { id: contact.id }, data: { agentStage: "HANDOVER", agentPaused: true, nextFollowUpAt: null } });
      await sendInChat({ contactId: contact.id, chatId, account, text: handoverMessage() });
      await alertKin(`Needs you: ${contact.lodgeName ?? contact.name} (+${contact.phone}). Their last message: "${batch.at(-1)?.text.slice(0, 160)}"`);
      return;
    }
  } catch (error) {
    // Jev unreachable: carry on (a reply to a stranger costs less than a lost lodge)
    await event("error", { step: "qualify", error: String(error) });
    if (mode === "shadow") return;
  }

  // --- The conversation (Claude Haiku 5.5 with tools) ------------------------
  const messages = await chatMessages(contact, items, batchPhotos);

  const ctx: ToolContext = {
    contactId: contact.id,
    chatId,
    account,
    send: (text) => sendInChat({ contactId: contact.id, chatId, account, text }),
    log: (kind, data, costUsd) => event(kind, data, costUsd),
  };

  let cost = 0;
  const calls: string[] = [];
  let reply: string | null = null;
  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const answer = await chat({ messages, tools: TOOLS });
      cost += answer.cost;
      const toolCalls = answer.message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        reply = answer.message.content?.trim() || null;
        break;
      }
      messages.push({ role: "assistant", content: answer.message.content, tool_calls: toolCalls });
      for (const call of toolCalls) {
        calls.push(call.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // A broken argument string: run with none, the tool says what's missing
        }
        const result = await runTool(call.function.name, args, ctx).catch(async (error: unknown) => {
          await event("error", { tool: call.function.name, error: String(error) });
          return `That didn't work (${error instanceof Error ? error.message : "an error"}). Carry on without it, or hand over if they need it.`;
        });
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
      if (ctx.silent) break;
    }
  } catch (error) {
    await event("error", { step: "reply", error: String(error) }, cost);
    await alertKin(`The agent couldn't reply to ${contact.lodgeName ?? contact.name} (+${contact.phone}): ${error instanceof Error ? error.message.slice(0, 120) : "an error"}`);
    return;
  }

  if (reply && !ctx.silent) await sendInChat({ contactId: contact.id, chatId, account, text: reply });
  else if (ctx.silent) await number?.markRead(chatId);
  if (contact.agentStage === "NEW") await prisma.contact.updateMany({ where: { id: contact.id, agentStage: "NEW" }, data: { agentStage: "DETAILS" } });
  await event("turn", { tools: calls, replied: Boolean(reply && !ctx.silent), silent: ctx.silent ?? null }, cost);
}

/** What they've sent since our last message (the batch a turn would answer), and their photos in it. */
function pendingBatch(items: Item[]) {
  const lastOurs = [...items].reverse().find((item) => item.from === "us");
  const batch = items.filter((item) => item.from === "them" && (!lastOurs || item.at > lastOurs.at));
  return { batch, photos: batch.flatMap((item) => (item.mediaId ? [item.mediaId] : [])) };
}

/**
 * The gate on a lead's conversation as it stands (replaying real chats before
 * going live): Jev's answers and the decision. Changes nothing.
 */
export async function assessLead(contactId: string) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const items = await conversation(contact);
  if (!items.some((item) => item.from === "them")) return { lead: contact.lodgeName ?? contact.name, skipped: "they haven't written anything" };
  const transcript = items.map((item) => `${item.from === "us" ? "StayZim" : "Them"}: ${item.text}`).join("\n");
  const photoIds = items.flatMap((item) => (item.mediaId ? [item.mediaId] : [])).slice(-PHOTOS_FOR_JEV);
  const photos = (await Promise.all(photoIds.map((id) => photoUrl(id, 512)))).filter((url): url is string => Boolean(url));
  const { answers, cost } = await decide(qualificationState(transcript, photos), qualificationQuestions(photos.length > 0));
  const qualification = toQualification(answers);
  return { lead: contact.lodgeName ?? contact.name, stage: contact.agentStage, qualification, decision: gate(qualification, null, contact.agentStage), cost, lastMessage: items.at(-1)?.text };
}

/**
 * What the agent would say to this lead now, with the real script and models,
 * but its tools only listed, never run, and nothing sent. For trying the script
 * on real chats.
 */
export async function previewReply(contactId: string) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const items = await conversation(contact);
  const { photos } = pendingBatch(items);
  if (!items.length || items.at(-1)?.from !== "them") return { lead: contact.lodgeName ?? contact.name, skipped: "nothing from them to answer" };
  const messages = await chatMessages(contact, items, photos);
  const answer = await chat({ messages, tools: TOOLS });
  return {
    lead: contact.lodgeName ?? contact.name,
    wouldSay: answer.message.content?.trim() || null,
    wouldCall: (answer.message.tool_calls ?? []).map((call) => ({ tool: call.function.name, args: call.function.arguments })),
    model: answer.model,
    cost: answer.cost,
  };
}
