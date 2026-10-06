import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";

/**
 * Validates the JSON body. On failure, answers 400 with the first problem as
 * one plain sentence the form can show, instead of zod's full report.
 */
export function validJson<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) return c.json({ error: result.error.issues[0]?.message ?? "Check the form" }, 400);
  });
}
