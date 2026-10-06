import { describe, expect, test } from "bun:test";

import { stayzimChatUrl, WHATSAPP_MESSAGES, whatsappTextUrl, whatsappUrl } from "./whatsapp";

// NEXT_PUBLIC_WHATSAPP_NUMBER is 263771234567 in tests (test/setup.ts)
describe("WhatsApp links", () => {
  test("open a chat with StayZim with the message typed in", () => {
    const url = new URL(whatsappUrl("growth"));
    expect(url.origin + url.pathname).toBe("https://wa.me/263771234567");
    expect(url.searchParams.get("text")).toBe(WHATSAPP_MESSAGES.growth);
    expect(new URL(stayzimChatUrl("I have paid $40 for mistvalley")).searchParams.get("text")).toBe("I have paid $40 for mistvalley");
  });

  test("let WhatsApp ask who to send to when there's no number", () => {
    expect(whatsappTextUrl("Book with us: https://mistvalley.stayzim.co.zw")).toBe(
      "https://wa.me/?text=Book%20with%20us%3A%20https%3A%2F%2Fmistvalley.stayzim.co.zw",
    );
  });
});
