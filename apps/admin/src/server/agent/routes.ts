import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { env } from "@stayzim/env/admin";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { queueAgentTurn } from "./queue";
import { AGENT_MODES, agentConfigured, getAgentMode, setAgentMode } from "./settings";
import { leadSites } from "./tools";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cost in US dollars of the agent's events since `since` (and for one lead, when given). */
async function costSince(since: Date, contactId?: string) {
  const sum = await prisma.agentEvent.aggregate({ where: { createdAt: { gte: since }, ...(contactId ? { contactId } : {}) }, _sum: { costUsd: true } });
  return sum._sum.costUsd ?? 0;
}

/**
 * /api/outreach/agent: the WhatsApp sales agent's switch, numbers and costs,
 * and one lead's agent panel (stage, qualification, log) with its buttons.
 */
export const agentRoutes = new Hono()
  .get("/", async (c) => {
    const now = Date.now();
    const [mode, stages, costToday, cost30d, recent] = await Promise.all([
      getAgentMode(),
      prisma.contact.groupBy({ by: ["agentStage"], where: { agentStage: { not: "NEW" } }, _count: true }),
      costSince(new Date(now - DAY_MS)),
      costSince(new Date(now - 30 * DAY_MS)),
      prisma.agentEvent.findMany({
        where: { kind: { in: ["decision", "reply", "tool", "alert", "paid", "error", "follow_up"] } },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, kind: true, data: true, costUsd: true, createdAt: true, chatId: true, contact: { select: { id: true, name: true, lodgeName: true } } },
      }),
    ]);
    return c.json({
      mode,
      configured: agentConfigured,
      accounts: env.AGENT_ACCOUNTS,
      models: { chat: env.AGENT_MODEL, fallback: env.AGENT_FALLBACK_MODEL, decisions: env.JEV_MODEL },
      stages: Object.fromEntries(stages.map((row) => [row.agentStage, row._count])),
      cost: { today: costToday, last30Days: cost30d },
      recent,
    });
  })

  .put("/mode", zValidator("json", z.object({ mode: z.enum(AGENT_MODES as [string, ...string[]]) })), async (c) => {
    const { mode } = c.req.valid("json");
    if (mode !== "off" && !agentConfigured) throw new HTTPException(400, { message: "Set OPENROUTER_API_KEY on the admin app first" });
    await setAgentMode(mode as "off" | "shadow" | "live");
    return c.json({ mode });
  })

  .get("/leads/:id", async (c) => {
    const contact = await prisma.contact.findUnique({ where: { id: c.req.param("id") } });
    if (!contact) throw new HTTPException(404, { message: "No such lead" });
    const [events, cost] = await Promise.all([
      prisma.agentEvent.findMany({ where: { contactId: contact.id }, orderBy: { createdAt: "desc" }, take: 60, select: { id: true, kind: true, data: true, costUsd: true, createdAt: true } }),
      costSince(new Date(0), contact.id),
    ]);
    return c.json({
      stage: contact.agentStage,
      paused: contact.agentPaused,
      account: contact.agentAccount,
      chatId: contact.agentChatId,
      qualification: contact.qualification,
      disqualifiedReason: contact.disqualifiedReason,
      nextFollowUpAt: contact.nextFollowUpAt,
      followUps: contact.followUps,
      cost,
      events,
    });
  })

  /**
   * take-over: the agent stops for this lead (the team replies themselves).
   * resume: it carries on, and answers anything waiting.
   * reply-anyway: a disqualified lead gets answered after all.
   */
  .post("/leads/:id/:action{take-over|resume|reply-anyway}", async (c) => {
    const contact = await prisma.contact.findUnique({ where: { id: c.req.param("id") } });
    if (!contact) throw new HTTPException(404, { message: "No such lead" });
    const action = c.req.param("action");
    if (action === "take-over") {
      await prisma.contact.update({ where: { id: contact.id }, data: { agentPaused: true, nextFollowUpAt: null } });
    } else {
      const sites = await leadSites(contact.id);
      const stage = contact.agentStage === "HANDOVER" || contact.agentStage === "DISQUALIFIED" ? (sites.length ? "OFFER" : contact.lodgeName ? "DETAILS" : "NEW") : contact.agentStage;
      await prisma.contact.update({ where: { id: contact.id }, data: { agentPaused: false, agentStage: stage, disqualifiedReason: null } });
      if (contact.agentAccount && contact.agentChatId) queueAgentTurn(contact.agentAccount, contact.agentChatId);
    }
    return c.json({ ok: true });
  });
