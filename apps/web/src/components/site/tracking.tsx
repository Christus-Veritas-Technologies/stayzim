"use client";

import { env } from "@stayzim/env/web";
import { cn } from "@stayzim/ui/lib/utils";
import { useEffect, type ReactNode } from "react";

const VISITOR_KEY = "stayzim.visitor";

/** A random id kept in this browser, so one guest's visits group together. Never personal data. */
function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Private mode: a fresh id per page load still counts the visit
    return crypto.randomUUID();
  }
}

/**
 * Tells StayZim about a page view or a Book on WhatsApp tap. `keepalive` lets
 * it finish while WhatsApp opens. Cookies go along so the owner's own visits
 * aren't counted. Never blocks or breaks the page.
 */
export function track(slug: string, type: "PAGE_VIEW" | "BOOKING_CHAT", roomId?: string) {
  try {
    void fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/sites/${slug}/events`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        visitorId: visitorId(),
        path: `${window.location.pathname}${window.location.hash}`,
        roomId,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => {});
  } catch {
    // Tracking is never worth an error on a guest's screen
  }
}

/** Records the page view once the page has loaded. */
export function PageViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track(slug, "PAGE_VIEW");
  }, [slug]);
  return null;
}

/** A wa.me link that records the tap first. Works without JavaScript too. */
export function BookLink({
  slug,
  href,
  roomId,
  className,
  children,
  ...props
}: {
  slug: string;
  href: string;
  roomId?: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => track(slug, "BOOKING_CHAT", roomId)}
      className={cn(className)}
      {...props}
    >
      {children}
    </a>
  );
}
