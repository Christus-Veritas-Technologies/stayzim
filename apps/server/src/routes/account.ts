import { zValidator } from "@hono/zod-validator";
import { auth, MIN_PASSWORD_LENGTH } from "@stayzim/auth";
import prisma from "@stayzim/db";
import { sendEmail } from "@stayzim/mail";
import { passwordChangedEmail } from "@stayzim/mail/templates";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { lodgeJson } from "../lib/lodge";
import { requireAuth, type AuthVariables } from "../lib/session";

const setPasswordSchema = z.object({
  // Not needed on first sign-in: the owner just proved the temporary password
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(128),
});

export const account = new Hono<{ Variables: AuthVariables }>()
  /**
   * The signed-in user, or 401, with a short summary of their lodge. Open to
   * owners still on a temporary password: first login shows them their live site.
   */
  .get("/me", requireAuth({ allowTemporaryPassword: true }), async (c) => {
    const user = c.get("user")!;
    const lodge = await prisma.lodge.findUnique({
      where: { ownerId: user.id },
      select: { id: true, name: true, slug: true, town: true, region: true, _count: { select: { rooms: true } } },
    });
    const hero = lodge ? (await lodgeJson(lodge.id)).heroUrl : null;
    return c.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      lodge: lodge
        ? {
            name: lodge.name,
            slug: lodge.slug,
            place: [lodge.town, lodge.region].filter(Boolean).join(", ") || null,
            heroUrl: hero,
            roomCount: lodge._count.rooms,
          }
        : null,
    });
  })

  /**
   * Replaces the password, signs out other devices, and lifts the
   * temporary-password block. Used on first sign-in and from settings.
   */
  .post(
    "/set-password",
    requireAuth({ allowTemporaryPassword: true }),
    zValidator("json", setPasswordSchema, (result, c) => {
      // One plain sentence the form can show, instead of zod's full report
      if (!result.success) return c.json({ error: result.error.issues[0]?.message ?? "Check the form" }, 400);
    }),
    async (c) => {
      const { currentPassword, newPassword } = c.req.valid("json");
      const user = c.get("user")!;
      const session = c.get("session")!;

      if (user.mustChangePassword) {
        // First sign-in: they're signed in with the temporary password StayZim sent,
        // so replace it directly and keep this session
        const ctx = await auth.$context;
        await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(newPassword));
        await prisma.session.deleteMany({ where: { userId: user.id, id: { not: session.id } } });
      } else {
        if (!currentPassword) throw new HTTPException(400, { message: "Enter your current password" });
        if (newPassword === currentPassword) {
          throw new HTTPException(400, { message: "Choose a password different from your current one" });
        }

        let authHeaders: Headers;
        try {
          ({ headers: authHeaders } = await auth.api.changePassword({
            body: { currentPassword, newPassword, revokeOtherSessions: true },
            headers: c.req.raw.headers,
            returnHeaders: true,
          }));
        } catch {
          // better-auth answers a wrong current password with an error, not a status
          throw new HTTPException(400, { message: "Your current password is wrong" });
        }
        // Revoking other sessions also replaces this one; pass the new cookie on,
        // or the owner is signed out by their own password change
        for (const cookie of authHeaders.getSetCookie()) {
          c.header("Set-Cookie", cookie, { append: true });
        }
      }

      await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
      await sendEmail(passwordChangedEmail({ to: user.email, name: user.name })).catch((error) => {
        console.error("[account] could not send password changed email:", error);
      });

      return c.json({ ok: true });
    },
  );
