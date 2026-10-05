import { env } from "@stayzim/env/web";

/** Pre-written first messages, so the team knows where a chat came from. */
export const WHATSAPP_MESSAGES = {
  general: "Hi StayZim, I'd like a website for my lodge. My lodge is called: ",
  demo: "Hi StayZim, can you build a demo site for my lodge first? My lodge is called: ",
  question: "Hi StayZim, I have a question: ",
  starter: "Hi StayZim, I'd like to ask about the Starter plan ($20/month).",
  growth: "Hi StayZim, I'd like to start the 14-day free trial on Growth. My lodge is called: ",
  pro: "Hi StayZim, I'd like to ask about the Pro plan ($75/month).",
  login: "Hi StayZim, I need help logging in to my lodge site.",
} as const;

export type WhatsAppMessage = keyof typeof WHATSAPP_MESSAGES;

/** wa.me link that opens a chat with StayZim with `message` already typed. */
export function whatsappUrl(message: WhatsAppMessage) {
  const text = encodeURIComponent(WHATSAPP_MESSAGES[message]);
  // Without a number, wa.me lets the visitor pick the chat; better than a dead link
  return `https://wa.me/${env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""}?text=${text}`;
}

export const CONTACT_EMAIL = "hello@stayzim.co.zw";
