import { env } from "@stayzim/env/web";

const VISITOR_KEY = "stayzim.visitor";
const UTM_KEY = "stayzim.utm";

type Utm = { utmSource?: string; utmMedium?: string; utmCampaign?: string };

export type CtaEvent = {
  /** Which button, e.g. "hero_whatsapp" */
  cta: string;
  /** Page section it sits in, e.g. "hero" */
  section: string;
  plan?: "starter" | "growth" | "pro";
};

/** Anonymous id kept in this browser, so one visitor's events can be grouped. */
function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Storage blocked (private mode etc.): still send, just ungrouped
    return crypto.randomUUID();
  }
}

/** UTM tags from the landing URL, remembered for the session so later clicks keep them. */
function utm(): Utm {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Utm = {
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
    };
    if (fromUrl.utmSource || fromUrl.utmMedium || fromUrl.utmCampaign) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    return JSON.parse(sessionStorage.getItem(UTM_KEY) ?? "{}") as Utm;
  } catch {
    return {};
  }
}

function send(body: Record<string, unknown>) {
  // keepalive lets the request finish even as the visitor leaves for WhatsApp
  void fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/landing/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Analytics must never get in the way of the visitor
  });
}

export function trackPageView() {
  send({
    type: "PAGE_VIEW",
    visitorId: visitorId(),
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    ...utm(),
  });
}

export function trackCta(event: CtaEvent) {
  send({
    type: "CTA_CLICK",
    visitorId: visitorId(),
    path: window.location.pathname,
    ...event,
    ...utm(),
  });
}
