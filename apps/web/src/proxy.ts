import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends visitors without a session cookie straight to /login, before any
 * dashboard code loads. This only checks the cookie exists; the pages (and
 * the API) still verify the session itself.
 *
 * The cookie is set by apps/server. It reaches this app because both run on
 * localhost in development, and share COOKIE_DOMAIN (.stayzim.co.zw) in production.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request, { cookiePrefix: "stayzim" })) return NextResponse.next();

  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/set-password"],
};
