import { env } from "@stayzim/env/server";

/** Who issues StayZim's invoices and receipts. No street address yet. */
export const issuer = {
  name: "StayZim Platform Inc",
  website: "stayzim.co.zw",
  email: "hello@stayzim.co.zw",
  phone: "+263 77 510 1506",
};

/** One line for emails: "StayZim Platform Inc · stayzim.co.zw · hello@stayzim.co.zw · +263 77 510 1506" */
export function issuerLine() {
  return [issuer.name, issuer.website, issuer.email, issuer.phone].join(" · ");
}

/** Merchant codes for paying outside Paynow; only the ones that are set. */
export function merchantCodes() {
  return [
    env.ECOCASH_MERCHANT_CODE ? { key: "ecocash" as const, name: "EcoCash", code: env.ECOCASH_MERCHANT_CODE } : null,
    env.INNBUCKS_MERCHANT_CODE ? { key: "innbucks" as const, name: "InnBucks", code: env.INNBUCKS_MERCHANT_CODE } : null,
  ].filter((method) => method !== null);
}
