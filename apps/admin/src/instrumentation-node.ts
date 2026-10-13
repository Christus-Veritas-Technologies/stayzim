import { startWhatsApp, stopWhatsApp } from "@/server/outreach/start";

void startWhatsApp();

// Save each session and close Chromium on a redeploy (docker stop sends SIGTERM)
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stopWhatsApp().finally(() => process.exit(0));
  });
}
