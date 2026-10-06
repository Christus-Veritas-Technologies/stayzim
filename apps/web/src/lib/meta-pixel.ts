import { env } from "@/lib/public-env";

/**
 * The Meta (Facebook) Pixel, for the ads: on only when NEXT_PUBLIC_META_PIXEL_ID
 * is set, and only on StayZim's own pages (never on lodge sites). Events:
 *
 * - PageView: each page of the landing page, sign-up, start and dashboard
 * - Contact: a tap on a "Chat on WhatsApp" button
 * - CompleteRegistration: an account made at /signup
 * - StartTrial: a demo site made at /start (value 0)
 * - InitiateCheckout: a payment started on Billing
 * - Purchase: a payment that went through (value and currency)
 */
export const META_PIXEL_ID = env.NEXT_PUBLIC_META_PIXEL_ID;

type MetaEvent = "PageView" | "Contact" | "CompleteRegistration" | "StartTrial" | "InitiateCheckout" | "Purchase";

type Fbq = (command: "track" | "init", name: string, params?: Record<string, unknown>) => void;

/** Reports an event to the Pixel, when it's on. Never throws. */
export function metaEvent(name: MetaEvent, params?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  try {
    (window as unknown as { fbq?: Fbq }).fbq?.("track", name, params);
  } catch {
    // Ads tracking is never worth an error
  }
}
