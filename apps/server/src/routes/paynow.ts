import prisma from "@stayzim/db";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { refreshPayment } from "../lib/billing";
import { parsePaynowFields, verifyPaynowHash } from "../lib/paynow";

/**
 * /api/paynow/result: Paynow posts here whenever a payment's status changes.
 * The post is checked against its hash, then we ask Paynow ourselves (with the
 * poll URL we stored, not one from the post) before applying anything.
 */
export const paynow = new Hono().post("/result", bodyLimit({ maxSize: 8 * 1024 }), async (c) => {
  const fields = parsePaynowFields(await c.req.text());
  if (!verifyPaynowHash(fields)) {
    console.warn(`[paynow] Ignored a result post with a bad hash (reference ${fields.reference ?? "none"})`);
    return c.body(null, 400);
  }
  const payment = fields.reference ? await prisma.payment.findUnique({ where: { reference: fields.reference }, select: { id: true } }) : null;
  if (payment) await refreshPayment(payment.id, { force: true });
  // Paynow only needs to hear that we got it
  return c.text("OK");
});
