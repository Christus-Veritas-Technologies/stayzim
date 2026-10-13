/**
 * Runs once when the admin's server starts: the WhatsApp numbers connect
 * (src/server/outreach). Only on the Node.js server, never in the edge runtime
 * or the browser, so the Node-only part is its own file (instrumentation-node.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}
