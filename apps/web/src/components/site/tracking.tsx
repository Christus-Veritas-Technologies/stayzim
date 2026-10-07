"use client";

import { cn } from "@stayzim/ui/lib/utils";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { env } from "@/lib/public-env";

/** What the booking request sheet needs: only when the site takes requests (Growth and Pro). */
export type BookingSite = {
  slug: string;
  name: string;
  whatsapp: string;
  themeColor: string;
  checkInFrom: string | null;
  checkOutBy: string | null;
  rooms: { id: string; name: string; price: number; sleeps: number }[];
};

// Loaded on the first tap of a Book button (started on pointerdown), so the site's first load stays light
const loadSheet = () => import("@/components/site/booking-request");
const BookingRequest = dynamic(() => loadSheet().then((module) => module.BookingRequest), { ssr: false });

/** Dates and guests the guest already chose, e.g. in an enquiry bar */
export type BookingStart = { checkIn?: string; checkOut?: string; guests?: number };

type BookingState = { site: BookingSite | null; open: (roomId?: string, start?: BookingStart) => void };
const BookingContext = createContext<BookingState>({ site: null, open: () => {} });

const VISITOR_KEY = "stayzim.visitor";

/** Off in template previews, so owners trying designs don't count as visitors. */
const TrackingContext = createContext({ slug: "", enabled: true });

export function SiteTracking({
  slug,
  enabled,
  booking = null,
  children,
}: {
  slug: string;
  enabled: boolean;
  /** Set when Book buttons open the request sheet instead of WhatsApp */
  booking?: BookingSite | null;
  children: ReactNode;
}) {
  const [request, setRequest] = useState<{ open: boolean; roomId?: string; start?: BookingStart; key: number } | null>(null);
  const open = useCallback(
    (roomId?: string, start?: BookingStart) => setRequest((current) => ({ open: true, roomId, start, key: (current?.key ?? 0) + 1 })),
    [],
  );
  const tracking = useMemo(() => ({ slug, enabled }), [slug, enabled]);
  const bookingState = useMemo(() => ({ site: booking, open }), [booking, open]);
  return (
    <TrackingContext.Provider value={tracking}>
      <BookingContext.Provider value={bookingState}>
        {children}
        {booking && request ? (
          <BookingRequest
            key={request.key}
            site={booking}
            roomId={request.roomId}
            start={request.start}
            open={request.open}
            onOpenChange={(next) => setRequest((current) => (current ? { ...current, open: next } : current))}
            onWhatsApp={(roomId) => {
              if (enabled) track(slug, "BOOKING_CHAT", roomId);
            }}
          />
        ) : null}
      </BookingContext.Provider>
    </TrackingContext.Provider>
  );
}

/**
 * For enquiry bars: whether the site takes bookings, a way to open the sheet,
 * and a way to count a WhatsApp enquiry (off in previews).
 */
export function useBooking() {
  const { slug, enabled } = useContext(TrackingContext);
  const { site, open } = useContext(BookingContext);
  return {
    online: site !== null,
    open,
    preload: () => void loadSheet(),
    trackChat: (roomId?: string) => {
      if (enabled && slug) track(slug, "BOOKING_CHAT", roomId);
    },
  };
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

/**
 * A Book button. Normally a wa.me link that records the tap first (it works
 * without JavaScript too). When the site takes requests, a tap opens the
 * booking sheet instead; the link stays as the fallback.
 */
export function BookLink({
  href,
  roomId,
  channel,
  className,
  children,
  ...props
}: {
  href: string;
  roomId?: string;
  /** "whatsapp": always opens the chat, even where the site takes bookings (the second way to book) */
  channel?: "whatsapp";
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { slug, enabled } = useContext(TrackingContext);
  const context = useContext(BookingContext);
  const booking = channel === "whatsapp" ? { site: null, open: context.open } : context;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onPointerDown={booking.site ? () => void loadSheet() : undefined}
      onClick={(event) => {
        if (booking.site) {
          event.preventDefault();
          booking.open(roomId);
          return;
        }
        if (enabled && slug) track(slug, "BOOKING_CHAT", roomId);
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </a>
  );
}
