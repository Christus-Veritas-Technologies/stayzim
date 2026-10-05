import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { Hono } from "hono";
import { z } from "zod";

import { normalizePhone } from "../whatsapp";

const listQuerySchema = z.object({
  phone: z.string().optional(),
  contactId: z.string().optional(),
  account: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const replies = new Hono().get("/", zValidator("query", listQuerySchema), async (c) => {
  const { phone, contactId, account, page, pageSize } = c.req.valid("query");
  const where = {
    ...(phone && { phone: normalizePhone(phone) }),
    ...(contactId && { contactId }),
    ...(account && { account }),
  };

  const [total, items] = await Promise.all([
    prisma.inboundMessage.count({ where }),
    prisma.inboundMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return c.json({ total, page, pageSize, items });
});
