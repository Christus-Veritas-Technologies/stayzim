import { BedDouble, ImageIcon, MessageCircle, Palette, Type, type LucideIcon } from "lucide-react";

/** GET /api/lodge/requests (mirrors requestJson in apps/server/src/routes/requests.ts; dates arrive as strings). */
export type ChangeRequest = {
  id: string;
  reference: string;
  topic: RequestTopic;
  message: string;
  status: RequestStatus;
  reply: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type RequestTopic = "TEXT" | "PHOTOS" | "ROOMS" | "DESIGN" | "OTHER";
export type RequestStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "DECLINED";

export const REQUEST_TOPICS: Record<RequestTopic, { label: string; icon: LucideIcon; example: string }> = {
  TEXT: { label: "Words", icon: Type, example: "Please add that we have a new swimming pool to our description." },
  PHOTOS: { label: "Photos", icon: ImageIcon, example: "Please swap the hero photo for one of the lake at sunset." },
  ROOMS: { label: "Rooms", icon: BedDouble, example: "Could you add our three new rondavels, with the photos I'll send on WhatsApp?" },
  DESIGN: { label: "Design", icon: Palette, example: "Could the rooms show before the gallery on our site?" },
  OTHER: { label: "Something else", icon: MessageCircle, example: "We'd like a section about our restaurant." },
};

export const REQUEST_TOPIC_ORDER: RequestTopic[] = ["TEXT", "PHOTOS", "ROOMS", "DESIGN", "OTHER"];

export const REQUEST_STATUSES: Record<RequestStatus, { label: string; badge: "purple" | "brand" | "success" | "neutral" }> = {
  OPEN: { label: "Open", badge: "purple" },
  IN_PROGRESS: { label: "In progress", badge: "brand" },
  DONE: { label: "Done", badge: "success" },
  DECLINED: { label: "Declined", badge: "neutral" },
};

/** The server's limits on a request's message. */
export const REQUEST_MESSAGE = { min: 10, max: 1000 } as const;

/** What the owner sends StayZim on WhatsApp after a request, so it's seen sooner. */
export function requestChatText(request: Pick<ChangeRequest, "reference" | "message">, lodgeName: string) {
  return `Change request ${request.reference} for ${lodgeName}: ${request.message}`;
}
