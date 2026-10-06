import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { lodgeSlugFromHost, siteUrl } from "@/lib/site-host";

const SIGNED_IN_ONLY = ["/dashboard", "/set-password", "/admin"];

/**
 * One Next.js app serves three things, told apart by the host:
 *
 * - {slug}.stayzim.co.zw: a lodge site, rewritten to /sites/{slug}.
 * - stayzim.co.zw and app.stayzim.co.zw: the landing page, login and dashboard.
 *   Visitors without a session cookie are sent to /login before any dashboard
 *   code loads (the pages and the API still check the session themselves).
 *
 * The session cookie is set by apps/server. It reaches this app because both run
 * on localhost in development, and share COOKIE_DOMAIN (.stayzim.co.zw) in production.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = lodgeSlugFromHost(request.headers.get("host"));

  if (slug) {
    // Lodge sites are one page; everything else on them is a 404 there
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/sites/${slug}` : `/sites/${slug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // A lodge site opened by path on the main domain: send it to its own address
  const sitePath = pathname.match(/^\/sites\/([a-z0-9-]+)/);
  if (sitePath) return NextResponse.redirect(siteUrl({ slug: sitePath[1]! }));

  if (SIGNED_IN_ONLY.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!getSessionCookie(request, { cookiePrefix: "stayzim" })) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own files and static files (anything with a dot)
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
