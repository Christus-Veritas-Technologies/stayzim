import prisma from "@stayzim/db";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { requireAuth, withSession, type AuthVariables } from "../lib/session";
import { validJson } from "../lib/validate";

/** StayZim staff only (accounts made with `create-owner --admin`). */
const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (c.get("user")?.role !== "ADMIN") throw new HTTPException(403, { message: "This is for the StayZim team" });
  await next();
});

const listQuery = z.object({
  /** open: open and in progress, oldest first (the queue). done: done and declined. all: everything, newest first. */
  status: z.enum(["open", "done", "all"]).default("open"),
});

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "DECLINED"]),
  reply: z
    .string()
    .trim()
    .max(1000, "Keep the reply under 1000 characters")
    .nullable()
    .optional()
    .transform((value) => value || null),
});

type RequestWithLodge = {
  id: string;
  reference: string;
  topic: string;
  message: string;
  status: string;
  reply: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  lodge: { name: string; slug: string; whatsapp: string | null; owner: { name: string; email: string } };
};

function adminRequestJson(request: RequestWithLodge) {
  const { id, reference, topic, message, status, reply, createdAt, resolvedAt, lodge } = request;
  return {
    id,
    reference,
    topic,
    message,
    status,
    reply,
    createdAt,
    resolvedAt,
    lodge: { name: lodge.name, slug: lodge.slug, whatsapp: lodge.whatsapp, ownerName: lodge.owner.name, ownerEmail: lodge.owner.email },
  };
}

const withLodge = { lodge: { select: { name: true, slug: true, whatsapp: true, owner: { select: { name: true, email: true } } } } } as const;

/** /api/admin: StayZim's own tools. Today: working through owners' change requests. */
export const admin = new Hono<{ Variables: AuthVariables }>()
  .use(withSession, requireAuth(), requireAdmin)

  .get("/requests", async (c) => {
    const query = listQuery.safeParse(c.req.query());
    if (!query.success) throw new HTTPException(400, { message: "Check the filter" });
    const { status } = query.data;
    const list = await prisma.changeRequest.findMany({
      where:
        status === "open"
          ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
          : status === "done"
            ? { status: { in: ["DONE", "DECLINED"] } }
            : {},
      orderBy: { createdAt: status === "open" ? "asc" : "desc" },
      include: withLodge,
      take: 200,
    });
    const [open, inProgress] = await Promise.all([
      prisma.changeRequest.count({ where: { status: "OPEN" } }),
      prisma.changeRequest.count({ where: { status: "IN_PROGRESS" } }),
    ]);
    return c.json({ requests: list.map(adminRequestJson), counts: { open, inProgress } });
  })

  /** Moves a request along, with an optional note the owner sees under their request. */
  .patch("/requests/:id", validJson(updateSchema), async (c) => {
    const { status, reply } = c.req.valid("json");
    const existing = await prisma.changeRequest.findUnique({ where: { id: c.req.param("id") }, select: { id: true, reply: true } });
    if (!existing) throw new HTTPException(404, { message: "That request no longer exists" });
    const updated = await prisma.changeRequest.update({
      where: { id: existing.id },
      data: {
        status,
        // Leaving the reply out keeps the one already there
        reply: reply === undefined ? existing.reply : reply,
        resolvedAt: status === "DONE" || status === "DECLINED" ? new Date() : null,
      },
      include: withLodge,
    });
    return c.json(adminRequestJson(updated));
  });
