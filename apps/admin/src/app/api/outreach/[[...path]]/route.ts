import { handle } from "hono/vercel";

import { outreachApp } from "@/server/outreach/app";

/** The outreach API (src/server/outreach/app.ts) on the admin's own server. */
export const dynamic = "force-dynamic";

const handler = handle(outreachApp);
export { handler as DELETE, handler as GET, handler as PATCH, handler as POST };
