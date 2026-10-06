import prisma from "@stayzim/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import type { LodgeVariables } from "../lib/lodge";
import { validJson } from "../lib/validate";

/** Plenty for real use; stops a stuck button from flooding StayZim. */
const MAX_OPEN = 10;

const requestSchema = z.object({
  topic: z.enum(["TEXT", "PHOTOS", "ROOMS", "DESIGN", "OTHER"]),
  message: z.string().trim().min(10, "Tell us a bit more (10 characters at least)").max(1000, "Keep it under 1000 characters"),
});

/** Easy to read out on the phone: no 0/O or 1/I. */
function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `R-${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function requestJson(request: {
  id: string;
  reference: string;
  topic: string;
  message: string;
  status: string;
  reply: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}) {
  const { id, reference, topic, message, status, reply, createdAt, resolvedAt } = request;
  return { id, reference, topic, message, status, reply, createdAt, resolvedAt };
}

/** /api/lodge/requests: changes the owner asks StayZim to make. Mounted under the lodge router. */
export const requests = new Hono<{ Variables: LodgeVariables }>()
  .get("/", async (c) => {
    const list = await prisma.changeRequest.findMany({ where: { lodgeId: c.var.lodgeId }, orderBy: { createdAt: "desc" }, take: 50 });
    return c.json(list.map(requestJson));
  })

  .post("/", validJson(requestSchema), async (c) => {
    const lodgeId = c.var.lodgeId;
    const open = await prisma.changeRequest.count({ where: { lodgeId, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    if (open >= MAX_OPEN) {
      throw new HTTPException(429, { message: "You have 10 requests waiting. We'll get through them, then send more." });
    }
    // References are short, so retry on the rare clash
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await prisma.changeRequest.create({ data: { ...c.req.valid("json"), lodgeId, reference: newReference() } });
        return c.json(requestJson(created), 201);
      } catch (error) {
        if (attempt === 4) throw error;
      }
    }
    throw new HTTPException(500, { message: "Try again" });
  });
