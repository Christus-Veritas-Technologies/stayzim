import prisma from "@stayzim/db";
import { addDays, DEMO_DAYS } from "@stayzim/sites";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { onDemoCreated } from "./billing";
import type { AuthVariables } from "./session";
import { removeUploads } from "./uploads";

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
  const lodge = await prisma.lodge.update({
    where: { id: lodgeId },
    data: { status: "DEMO", demoEndsAt: addDays(new Date(), DEMO_DAYS) },
    select: { id: true, leadId: true },
  });
  await onDemoCreated(lodge.id);
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
