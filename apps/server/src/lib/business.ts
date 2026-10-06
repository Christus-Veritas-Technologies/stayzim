import { env } from "@stayzim/env/server";

/** Who issues StayZim's invoices and receipts, from BUSINESS_* (packages/env). */
export const issuer = {
  name: env.BUSINESS_NAME,
  lines: env.BUSINESS_ADDRESS.split("|").map((line) => line.trim()).filter(Boolean),
  email: env.BUSINESS_EMAIL,
  taxNumber: env.BUSINESS_TAX_NUMBER ?? null,
  website: "stayzim.co.zw",
};

/** One line for emails: "StayZim · 12 Main Street, Mutare · BP 200012345" */
export function issuerLine() {
  return [issuer.name, issuer.lines.join(", "), issuer.taxNumber ? `Tax no. ${issuer.taxNumber}` : null].filter(Boolean).join(" · ");
}

/** Merchant codes for paying outside Paynow; only the ones that are set. */
export function merchantCodes() {
  return [
    env.ECOCASH_MERCHANT_CODE ? { key: "ecocash" as const, name: "EcoCash", code: env.ECOCASH_MERCHANT_CODE } : null,
    env.INNBUCKS_MERCHANT_CODE ? { key: "innbucks" as const, name: "InnBucks", code: env.INNBUCKS_MERCHANT_CODE } : null,
  ].filter((method) => method !== null);
}
