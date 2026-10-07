import { env } from "@/lib/public-env";

const VISITOR_KEY = "stayzim.visitor";
const UTM_KEY = "stayzim.utm";

type Utm = { utmSource?: string; utmMedium?: string; utmCampaign?: string };
/** Where a sign-up came from, saved with the lodge: the ad's utm_* tags and the site that sent them. */
export type SignupSource = Utm & { utmContent?: string; referrer?: string };
const SOURCE_KEY = "stayzim.source";

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

/**
 * The first place this visitor came from in this session (an ad link's utm_*,
 * or another site), so a lodge made at /create after browsing the landing page
 * still knows it came from Meta.
 */
export function signupSource(): SignupSource {
  try {
    const params = new URLSearchParams(window.location.search);
    const external = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined;
    const fromUrl: SignupSource = {
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      utmContent: params.get("utm_content") ?? undefined,
      referrer: external,
    };
    const saved = JSON.parse(sessionStorage.getItem(SOURCE_KEY) ?? "null") as SignupSource | null;
    if (saved) return saved;
    sessionStorage.setItem(SOURCE_KEY, JSON.stringify(fromUrl));
    return fromUrl;
  } catch {
    return {};
  }
}

/**
 * One step of /create, for the drop-off funnel: open → lodge (name and
 * WhatsApp done, demo made) → photo (first photo up) → live → claim.
 * Stored as CTA_CLICK events in the "create" section.
 */
export type CreateStep = "open" | "lodge" | "photo" | "live" | "claim";

export function trackCreateStep(step: CreateStep) {
  send({ type: "CTA_CLICK", visitorId: visitorId(), path: "/create", cta: `create_${step}`, section: "create", ...utm() });
}

export function trackPageView() {
  signupSource();
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
