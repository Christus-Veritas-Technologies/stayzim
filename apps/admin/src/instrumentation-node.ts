import { startFollowUps } from "@/server/agent/follow-ups";
import { resumeUnansweredChats } from "@/server/agent/queue";
import { startWhatsApp, stopWhatsApp } from "@/server/outreach/start";

// whatsapp-web.js and puppeteer sometimes fail inside their own event handlers
// (WhatsApp Web reloading mid-send, a browser closing), where nothing can catch
// it. Node stops the whole process for that, which took the admin down with it.
// Log it and keep serving: each number's own checks restart its browser.
process.on("unhandledRejection", (reason) => {
  console.error("[admin] unhandled rejection, still running:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[admin] uncaught exception, still running:", error);
});

void startWhatsApp();
// The sales agent's follow-ups and payment checks (it answers messages as they come in)
startFollowUps();
// Messages that came in just before a redeploy (their turn's timer was in the old process)
setTimeout(() => void resumeUnansweredChats().catch((error: unknown) => console.error("[agent] resuming chats failed:", error)), 30_000).unref?.();

// Save each session and close Chromium on a redeploy (docker stop sends SIGTERM)
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stopWhatsApp().finally(() => process.exit(0));
  });
}
