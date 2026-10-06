import { env } from "@/lib/public-env";

/** Pre-written first messages, so the team knows where a chat came from. */
export const WHATSAPP_MESSAGES = {
  general: "Hi StayZim, I'd like a website for my lodge. My lodge is called: ",
  demo: "Hi StayZim, can you build a demo site for my lodge first? My lodge is called: ",
  question: "Hi StayZim, I have a question: ",
  starter: "Hi StayZim, I'd like to ask about the Starter plan ($20/month).",
  growth: "Hi StayZim, I'd like to ask about the Growth plan ($40/month).",
  pro: "Hi StayZim, I'd like to ask about the Pro plan ($75/month).",
  help: "Hi StayZim, I need help with my lodge dashboard: ",
  login: "Hi StayZim, I can't log in to my lodge dashboard. My email is: ",
} as const;

export type WhatsAppMessage = keyof typeof WHATSAPP_MESSAGES;

/** wa.me link that opens a chat with StayZim with `message` already typed. */
export function whatsappUrl(message: WhatsAppMessage) {
  return whatsappTextUrl(WHATSAPP_MESSAGES[message], env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

/**
 * wa.me link with any text typed in. Without a number, WhatsApp asks who to
 * send it to (e.g. an owner sharing their site with past guests); for StayZim's
 * own chats that's still better than a dead link.
 */
export function whatsappTextUrl(text: string, phone?: string) {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}

/** Opens a chat with StayZim with any text typed in, e.g. "I have paid" with the lodge and amount. */
export function stayzimChatUrl(text: string) {
  return whatsappTextUrl(text, env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

export const CONTACT_EMAIL = "hello@stayzim.co.zw";
