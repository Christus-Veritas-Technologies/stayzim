import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { getCampaign, startCampaign, stopCampaign } from "../outreach";
import { phoneSchema } from "./contacts";

export const startCampaignSchema = z
  .object({
    /** Supports {name} and {city} placeholders. */
    message: z.string().trim().min(1).max(4096),
    contactIds: z.array(z.string()).min(1).optional(),
    phones: z.array(phoneSchema).min(1).optional(),
    city: z.string().trim().min(1).optional(),
    limit: z.number().int().min(1).max(5000).optional(),
    account: z.string().optional(),
    retryFailed: z.boolean().default(false),
    minDelaySeconds: z.number().min(5).max(3600).default(20),
    maxDelaySeconds: z.number().min(5).max(3600).default(60),
  })
  .refine((value) => value.maxDelaySeconds >= value.minDelaySeconds, {
    message: "maxDelaySeconds must be >= minDelaySeconds",
    path: ["maxDelaySeconds"],
  });

export const campaigns = new Hono()
  .post("/", zValidator("json", startCampaignSchema), async (c) => {
    return c.json(await startCampaign(c.req.valid("json")), 202);
  })
  .get("/current", (c) => c.json(getCampaign()))
  .post("/current/stop", (c) => c.json(stopCampaign()));
