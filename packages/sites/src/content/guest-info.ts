/**
 * Guest info rules with no zod in them, so the dashboard's forms can use them
 * in the browser (docs/cms/guest-info.md). The server validates with
 * schemas.ts, which builds on these.
 */

export type SocialKey = "facebook" | "instagram" | "tiktok" | "tripadvisor" | "bookingCom" | "airbnb";

export type SocialLinks = Partial<Record<SocialKey, string>>;

export type FaqEntry = { q: string; a: string };

type Network = {
  label: string;
  /** Hosts a link may be on (subdomains such as www. and m. are fine) */
  hosts: readonly string[];
  /** "@mistvalley" becomes this + "mistvalley" */
  handleUrl?: string;
  placeholder: string;
};

/** In the order they show on the site. */
export const SOCIAL_NETWORKS: Record<SocialKey, Network> = {
  facebook: { label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"], placeholder: "facebook.com/yourlodge" },
  instagram: { label: "Instagram", hosts: ["instagram.com"], handleUrl: "https://instagram.com/", placeholder: "@yourlodge" },
  tiktok: { label: "TikTok", hosts: ["tiktok.com"], handleUrl: "https://www.tiktok.com/@", placeholder: "@yourlodge" },
  tripadvisor: {
    label: "Tripadvisor",
    hosts: ["tripadvisor.com", "tripadvisor.co.za", "tripadvisor.co.uk", "tripadvisor.ca", "tripadvisor.com.au"],
    placeholder: "tripadvisor.com/Hotel_Review-…",
  },
  bookingCom: { label: "Booking.com", hosts: ["booking.com"], placeholder: "booking.com/hotel/zw/…" },
  airbnb: { label: "Airbnb", hosts: ["airbnb.com", "airbnb.co.za", "airbnb.co.uk", "airbnb.ca", "airbnb.com.au"], placeholder: "airbnb.com/rooms/…" },
};

export const SOCIAL_KEYS = Object.keys(SOCIAL_NETWORKS) as SocialKey[];

const notThis = (label: string) => `That isn't ${/^[AEIOU]/.test(label) ? "an" : "a"} ${label} link`;

/**
 * What the owner typed as a clean https link, or an error sentence. Empty is
 * fine (null: no link). "@mistvalley" works for Instagram and TikTok.
 */
export function socialLink(key: SocialKey, input: string): { url: string | null } | { error: string } {
  const network = SOCIAL_NETWORKS[key];
  const text = input.trim();
  if (!text) return { url: null };
  const handle = /^@?([A-Za-z0-9._]{1,30})$/.exec(text);
  if (network.handleUrl && handle && (text.startsWith("@") || !text.includes("."))) {
    return { url: `${network.handleUrl}${handle[1]}` };
  }
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: notThis(network.label) };
  }
  const host = url.hostname.toLowerCase();
  if (!network.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return { error: notThis(network.label) };
  }
  if (url.pathname === "/" || url.pathname === "") return { error: `Add the link to your ${network.label} page` };
  url.protocol = "https:";
  url.hash = "";
  const clean = url.toString();
  if (clean.length > 300) return { error: "That link is too long" };
  return { url: clean };
}

/** Times owners pick from, every 30 minutes: "06:00" … "23:30". */
export const STAY_TIMES = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

export const HOUSE_RULE_SUGGESTIONS = [
  "No smoking indoors",
  "Quiet after 22:00",
  "No pets",
  "Children welcome",
  "ID needed at check-in",
  "No parties or events",
];

export const FAQ_SUGGESTIONS = [
  "Is breakfast included?",
  "Do you take children?",
  "Is there parking?",
  "Can I pay with EcoCash?",
  "Is there Wi-Fi?",
  "How do I get there?",
];

/** Stored JSON read back safely: anything unexpected becomes empty, so a bad row never breaks a site. */
export function readHouseRules(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((rule): rule is string => typeof rule === "string" && rule.trim() !== "") : [];
}

export function readFaq(value: unknown): FaqEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is FaqEntry =>
      typeof entry === "object" && entry !== null && typeof entry.q === "string" && typeof entry.a === "string" && entry.q !== "",
  );
}

export function readSocialLinks(value: unknown): SocialLinks {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const links: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const url = (value as Record<string, unknown>)[key];
    if (typeof url === "string" && url.startsWith("https://")) links[key] = url;
  }
  return links;
}
