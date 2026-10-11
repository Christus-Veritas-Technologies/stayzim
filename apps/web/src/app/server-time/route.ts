/** The server's clock, for the founding countdown: a wrong clock on a visitor's phone can't move the deadline. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
