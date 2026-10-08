import { normalizeDomain } from "@stayzim/sites";
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { slugForCustomDomain } from "@/lib/custom-domains";
import { isStayZimHost, lodgeSlugFromHost, mainSiteRedirect, siteUrl } from "@/lib/site-host";

const SIGNED_IN_ONLY = ["/dashboard", "/set-password", "/admin"];

/** Shows a lodge's site: /sites/{slug}, and its other pages under it (paths its plan doesn't have 404 there). */
function lodgeSite(request: NextRequest, slug: string) {
  const url = request.nextUrl.clone();
  url.pathname = request.nextUrl.pathname === "/" ? `/sites/${slug}` : `/sites/${slug}${request.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

/**
 * One Next.js app serves four things, told apart by the host:
 *
 * - {slug}.stayzim.co.zw: a lodge site, rewritten to /sites/{slug}.
 * - A lodge's own domain (mistvalleylodge.co.zw, set with set-domain.ts): the
 *   same, after asking the API which lodge it belongs to. Unknown domains get
 *   the not-found page.
 * - stayzim.co.zw: the landing page, login and dashboard. www. and app. redirect there.
 *   Visitors without a session cookie are sent to /login before any dashboard
 *   code loads (the pages and the API still check the session themselves).
 *
 * The session cookie is set by apps/server. It reaches this app because both run
 * on localhost in development, and share COOKIE_DOMAIN (.stayzim.co.zw) in production.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  const main = mainSiteRedirect(host, `${pathname}${request.nextUrl.search}`);
  if (main) return NextResponse.redirect(main, 308);

  const slug = lodgeSlugFromHost(host);
  if (slug) return lodgeSite(request, slug);

  if (!isStayZimHost(host)) {
    const own = await slugForCustomDomain(host);
    // One address per site: www.{domain} goes to {domain}, which the canonical tags name too
    if (own && host?.toLowerCase().startsWith("www.")) {
      return NextResponse.redirect(`${siteUrl({ slug: own, customDomain: normalizeDomain(host) })}${pathname === "/" ? "" : pathname}${request.nextUrl.search}`, 308);
    }
    // "-" is never a lodge, so an unknown domain shows the not-found page
    return lodgeSite(request, own ?? "-");
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
