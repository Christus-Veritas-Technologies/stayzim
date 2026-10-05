import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { Hono } from "hono";
import { z } from "zod";

import { sendToPhone } from "../outreach";
import { normalizePhone } from "../whatsapp";
import { phoneSchema } from "./contacts";

const sendMessageSchema = z.object({
  phone: phoneSchema,
  message: z.string().trim().min(1).max(4096),
  /** Which number to send from. Omit to rotate across connected numbers. */
  account: z.string().optional(),
});

const listQuerySchema = z.object({
  phone: z.string().optional(),
  contactId: z.string().optional(),
  account: z.string().optional(),
  status: z.enum(["SENT", "NOT_ON_WHATSAPP", "FAILED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const messages: Hono = new Hono()
  .post("/", zValidator("json", sendMessageSchema), async (c) => {
    const result = await sendToPhone(c.req.valid("json"));
    const httpStatus = result.status === "SENT" ? 201 : result.status === "NOT_ON_WHATSAPP" ? 422 : 502;
    return c.json(result, httpStatus);
  })

  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { phone, contactId, account, status, page, pageSize } = c.req.valid("query");
    const where = {
      ...(phone && { phone: normalizePhone(phone) }),
      ...(contactId && { contactId }),
      ...(account && { account }),
      ...(status && { status }),
    };

    const [total, items] = await Promise.all([
      prisma.outreachMessage.count({ where }),
      prisma.outreachMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return c.json({ total, page, pageSize, items });
  });
