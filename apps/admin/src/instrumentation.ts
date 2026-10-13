/**
 * Runs once when the admin's server starts: the WhatsApp numbers connect
 * (src/server/outreach). Only on the Node.js server, never in the edge runtime
 * or the browser.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startWhatsApp, stopWhatsApp } = await import("@/server/outreach/start");
  void startWhatsApp();
  // Save each session and close Chromium on a redeploy (docker stop sends SIGTERM)
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void stopWhatsApp().finally(() => process.exit(0));
    });
  }
}
