"use client";

import { env } from "@/lib/public-env";
import { cn } from "@stayzim/ui/lib/utils";
import { createContext, useContext, useEffect, type ReactNode } from "react";

const VISITOR_KEY = "stayzim.visitor";

/** Off in template previews, so owners trying designs don't count as visitors. */
const TrackingContext = createContext({ slug: "", enabled: true });

export function SiteTracking({ slug, enabled, children }: { slug: string; enabled: boolean; children: ReactNode }) {
  return <TrackingContext.Provider value={{ slug, enabled }}>{children}</TrackingContext.Provider>;
}

/** A version 4 UUID. crypto.randomUUID only exists on HTTPS pages; getRandomValues works on any. */
function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A random id kept in this browser, so one guest's visits group together. Never personal data. */
function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Private mode: a fresh id per page load still counts the visit
    return randomId();
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

/** Page views already sent from this page load, so re-mounts (and React's dev double effects) count once. */
const counted = new Set<string>();

/** Records the page view once the page has loaded (not in previews). */
export function PageViewTracker() {
  const { slug, enabled } = useContext(TrackingContext);
  useEffect(() => {
    if (!enabled || !slug) return;
    const key = `${slug}${window.location.pathname}`;
    if (counted.has(key)) return;
    counted.add(key);
    track(slug, "PAGE_VIEW");
  }, [enabled, slug]);
  return null;
}

/** A wa.me link that records the tap first. Works without JavaScript too. */
export function BookLink({
  href,
  roomId,
  className,
  children,
  ...props
}: {
  href: string;
  roomId?: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { slug, enabled } = useContext(TrackingContext);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        if (enabled && slug) track(slug, "BOOKING_CHAT", roomId);
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </a>
  );
}
