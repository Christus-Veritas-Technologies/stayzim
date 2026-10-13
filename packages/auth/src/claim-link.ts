import prisma from "@stayzim/db";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

/**
 * "Give to lead" (admin app): a site the team made for a lead is owned by a
 * placeholder guest account until the lead takes it. Its one-time claim link
 * (stayzim.co.zw/claim/<token>) signs whoever opens it in as that guest, so the
 * site is theirs to claim with their email and password, the same "Claim my
 * site" as /create. Only the token's SHA-256 is stored (`lodge.claim_token_hash`).
 */

/** The hash stored for a claim token. */
export async function claimTokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A new claim token: 32 random bytes, URL-safe. */
export function newClaimToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type RedeemedHandler = (lodgeId: string) => Promise<void>;
let onRedeemed: RedeemedHandler = async () => {};

/**
 * What happens once a link is used (the API sets it at boot): the free preview
 * starts, and the lead's other sites go. Kept out of here because it needs the
 * API's billing code.
 */
export function onClaimLinkRedeemed(handler: RedeemedHandler) {
  onRedeemed = handler;
}

export const claimLink = () =>
  ({
    id: "claim-link",
    endpoints: {
      redeemClaimLink: createAuthEndpoint(
        "/claim-link/redeem",
        { method: "POST", body: z.object({ token: z.string().min(20).max(200) }) },
        async (ctx) => {
          const lodge = await prisma.lodge.findUnique({
            where: { claimTokenHash: await claimTokenHash(ctx.body.token) },
            select: { id: true, slug: true, ownerId: true, claimTokenExpiresAt: true, owner: { select: { isAnonymous: true } } },
          });
          if (!lodge) throw new APIError("NOT_FOUND", { message: "This link has already been used, or it isn't right. Ask us for a new one." });
          if (!lodge.claimTokenExpiresAt || lodge.claimTokenExpiresAt.getTime() < Date.now()) {
            throw new APIError("GONE", { message: "This link has expired. Ask us for a new one." });
          }
          if (!lodge.owner.isAnonymous) throw new APIError("CONFLICT", { message: "This site has been claimed already. Log in to open it." });

          const user = await ctx.context.internalAdapter.findUserById(lodge.ownerId);
          const session = user ? await ctx.context.internalAdapter.createSession(user.id) : null;
          if (!user || !session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "We couldn't open your site. Try the link again." });

          // One use only
          await prisma.lodge.update({ where: { id: lodge.id }, data: { claimTokenHash: null, claimTokenExpiresAt: null } });
          await setSessionCookie(ctx, { session, user });
          await onRedeemed(lodge.id);
          return ctx.json({ slug: lodge.slug });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
