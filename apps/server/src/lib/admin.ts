import { timingSafeEqual } from "node:crypto";

import type { Session } from "@stayzim/auth";
import prisma from "@stayzim/db";
import { env } from "@stayzim/env/server";
import { addDays, DEMO_DAYS } from "@stayzim/sites";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { onDemoCreated } from "./billing";
import { withSession, type AuthVariables } from "./session";
import { removeUploads } from "./uploads";

function sameToken(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The admin routes' sign-in: a team member's session, as the admin app sends it,
 * or "Authorization: Bearer <ADMIN_API_TOKEN>" from a script (and Claude), which
 * acts as the team login ADMIN_EMAIL (or the first team account, when that
 * address is someone's own login). Same powers either way.
 */
export const withTeamSession = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return withSession(c, next);
  if (!env.ADMIN_API_TOKEN || !sameToken(header.slice(7), env.ADMIN_API_TOKEN)) throw new HTTPException(401, { message: "Wrong token" });
  // ADMIN_EMAIL when it's a team account (it may be someone's own login instead), else the first team account
  const user =
    (env.ADMIN_EMAIL ? await prisma.user.findFirst({ where: { role: "ADMIN", email: env.ADMIN_EMAIL.toLowerCase() } }) : null) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }));
  if (!user) throw new HTTPException(503, { message: "No team account yet: set ADMIN_EMAIL and restart the API" });
  c.set("user", { ...user, mustChangePassword: false } as unknown as Session["user"]);
  c.set("session", null);
  await next();
});

/** StayZim staff only (accounts made with `create-owner --admin`): the admin app's routes. */
export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (c.get("user")?.role !== "ADMIN") throw new HTTPException(403, { message: "This is for the StayZim team" });
  await next();
});

/**
 * Deletes a lodge with its photos (in storage too), billing notices and, when
 * the account was only for this lodge (an owner or a guest, never the team),
 * its owner's account, so the email can sign up again.
 */
export async function deleteLodge(lodgeId: string) {
  const lodge = await prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    select: { slug: true, logoKey: true, ownerId: true, owner: { select: { role: true } }, photos: { select: { key: true, mediumKey: true, smallKey: true } } },
  });
  const keys = [lodge.logoKey, ...lodge.photos.flatMap((photo) => [photo.key, photo.mediumKey, photo.smallKey])].filter((key): key is string => Boolean(key));
  await prisma.$transaction([
    prisma.lodge.update({ where: { id: lodgeId }, data: { heroPhotoId: null } }),
    prisma.lodge.delete({ where: { id: lodgeId } }),
    prisma.billingNotice.deleteMany({ where: { lodgeId } }),
    ...(lodge.owner.role === "OWNER" ? [prisma.user.delete({ where: { id: lodge.ownerId } })] : []),
  ]);
  await removeUploads(keys);
  return lodge.slug;
}

/**
 * A lead opened the claim link for one of the sites made for them: it's theirs
 * now. Its 2-day free preview starts (with its first invoice), and the lead's
 * other sites, still on placeholder accounts, are deleted.
 */
export async function onLeadSiteClaimed(lodgeId: string) {
  const current = await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { status: true } });
  // Paid already (a payment link, before they claimed it): it stays live as it is
  const paid = current.status !== "DEMO";
  const lodge = paid
    ? await prisma.lodge.findUniqueOrThrow({ where: { id: lodgeId }, select: { id: true, leadId: true } })
    : await prisma.lodge.update({
        where: { id: lodgeId },
        data: { status: "DEMO", demoEndsAt: addDays(new Date(), DEMO_DAYS) },
        select: { id: true, leadId: true },
      });
  if (!paid) await onDemoCreated(lodge.id);
  if (!lodge.leadId) return;
  const others = await prisma.lodge.findMany({
    where: { leadId: lodge.leadId, id: { not: lodge.id }, owner: { isAnonymous: true }, payments: { none: { status: "PAID" } } },
    select: { id: true },
  });
  for (const other of others) {
    const slug = await deleteLodge(other.id);
    console.log(`[admin] Deleted ${slug}: its lead took another of their sites`);
  }
}
