import { env } from "@/lib/public-env";

/**
 * The Meta (Facebook) Pixel, for the ads: only on StayZim's own pages (never on
 * lodge sites), and only in production builds, so local work doesn't report to
 * Meta. NEXT_PUBLIC_META_PIXEL=off switches it off (CI's browser tests). Events:
 *
 * - PageView: each page of the landing page, sign-up, start and dashboard
 * - Contact: a tap on a "Chat on WhatsApp" button
 * - CompleteRegistration: an account made at /signup
 * - StartTrial: a demo site made at /start (value 0)
 * - InitiateCheckout: a payment started on Billing
 * - Purchase: a payment that went through (value and currency)
 */
export const META_PIXEL_ID = "1632288361926055";

/** Whether this build loads the Pixel. */
export const PIXEL_ON = process.env.NODE_ENV === "production" && env.NEXT_PUBLIC_META_PIXEL !== "off";

type MetaEvent = "PageView" | "Contact" | "CompleteRegistration" | "StartTrial" | "InitiateCheckout" | "Purchase";

type Fbq = (command: "track" | "init", name: string, params?: Record<string, unknown>) => void;

/** A /create step for Meta's funnel ("CreateStep", custom): where people stop. */
export function metaCreateStep(step: string) {
  if (!PIXEL_ON || typeof window === "undefined") return;
  try {
    (window as unknown as { fbq?: (command: "trackCustom", name: string, params?: Record<string, unknown>) => void }).fbq?.("trackCustom", "CreateStep", { step });
  } catch {
    // Ads tracking is never worth an error
  }
}

/** Reports an event to the Pixel, when it's on. Never throws. */
export function metaEvent(name: MetaEvent, params?: Record<string, unknown>) {
  if (!PIXEL_ON || typeof window === "undefined") return;
  try {
    (window as unknown as { fbq?: Fbq }).fbq?.("track", name, params);
  } catch {
    // Ads tracking is never worth an error
  }
}
