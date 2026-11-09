/**
 * A stand-in for Paynow's form protocol (signed fields, as apps/server/src/lib/paynow.ts
 * speaks it), for trying payments locally without real money. Point the API at it:
 *
 *   PAYNOW_INTEGRATION_ID=12345 PAYNOW_INTEGRATION_KEY=standin-key PAYNOW_API_URL=http://localhost:9977
 *   bun scripts/paynow-standin.ts
 *
 * What a prompt does depends on the number:
 *   0771111111, 0711111111  paid after 6 s (EcoCash, OneMoney)
 *   0782222222              cancelled after 6 s
 *   0774444444              waits forever ("Sent": the prompt timed out on the phone)
 *   0775555555              Paynow refuses to start it
 * Paynow's page (web) waits until GET /control/paid?ref=<our reference> (also for a waiting prompt).
 */

const PORT = 9977;
const KEY = process.env.PAYNOW_INTEGRATION_KEY ?? "standin-key";

type Payment = { reference: string; amount: string; phone: string | null; method: string; startedAt: number; forced?: "Paid" };
const payments = new Map<string, Payment>();

function hash(fields: [string, string][]) {
  return new Bun.CryptoHasher("sha512")
    .update(fields.map(([, value]) => value).join("") + KEY.toLowerCase())
    .digest("hex")
    .toUpperCase();
}

function signed(fields: [string, string][]) {
  return new URLSearchParams([...fields, ["hash", hash(fields)]]).toString();
}

function statusOf(payment: Payment) {
  if (payment.forced) return payment.forced;
  const after6s = Date.now() - payment.startedAt > 6_000;
  if (payment.phone === "0771111111" || payment.phone === "0711111111") return after6s ? "Paid" : "Sent";
  if (payment.phone === "0782222222") return after6s ? "Cancelled" : "Sent";
  return payment.method === "web" ? "Created" : "Sent";
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const body = new URLSearchParams(request.method === "POST" ? await request.text() : "");
    const pollUrl = (reference: string) => `http://localhost:${PORT}/poll?ref=${encodeURIComponent(reference)}`;

    if (url.pathname === "/interface/remotetransaction" || url.pathname === "/interface/initiatetransaction") {
      const reference = body.get("reference") ?? "";
      const phone = body.get("phone");
      const method = url.pathname.endsWith("remotetransaction") ? (body.get("method") ?? "ecocash") : "web";
      console.log(`[paynow-standin] ${method} ${reference} $${body.get("amount")}${phone ? ` to ${phone}` : ""}`);
      if (phone === "0775555555") return new Response(new URLSearchParams({ status: "Error", error: "Could not reach the subscriber's network" }).toString());
      payments.set(reference, { reference, amount: body.get("amount") ?? "0.00", phone, method, startedAt: Date.now() });
      const fields: [string, string][] = [
        ["status", "Ok"],
        ...(method === "web" ? ([["browserurl", `http://localhost:${PORT}/page?ref=${reference}`]] as [string, string][]) : ([["instructions", "Dial *151*2*7# and enter your PIN"]] as [string, string][])),
        ["paynowreference", String(100000 + payments.size)],
        ["pollurl", pollUrl(reference)],
      ];
      return new Response(signed(fields));
    }

    if (url.pathname === "/poll") {
      const payment = payments.get(url.searchParams.get("ref") ?? "");
      if (!payment) return new Response(new URLSearchParams({ status: "Error", error: "No such payment" }).toString());
      return new Response(
        signed([
          ["reference", payment.reference],
          ["paynowreference", "100001"],
          ["amount", payment.amount],
          ["status", statusOf(payment)],
          ["pollurl", pollUrl(payment.reference)],
        ]),
      );
    }

    if (url.pathname === "/control/paid") {
      const payment = payments.get(url.searchParams.get("ref") ?? "");
      if (!payment) return new Response("no such payment", { status: 404 });
      payment.forced = "Paid";
      console.log(`[paynow-standin] ${payment.reference} paid (control)`);
      return new Response("ok");
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(`[paynow-standin] on http://localhost:${PORT}`);
