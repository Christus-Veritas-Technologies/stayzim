import { auth, type Session } from "@stayzim/auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export type AuthVariables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

/** Reads the session cookie (if any) and exposes `c.var.user` / `c.var.session`. */
export const withSession = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  c.set("session", result?.session ?? null);
  await next();
});

/**
 * Only signed-in users. Owners still on a temporary password are refused too,
 * unless the route is how they set their own (`allowTemporaryPassword`).
 */
export function requireAuth({ allowTemporaryPassword = false } = {}) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw new HTTPException(401, { message: "Sign in to continue" });
    if (user.mustChangePassword && !allowTemporaryPassword) {
      throw new HTTPException(403, { message: "Choose a new password to continue" });
    }
    await next();
  });
}
