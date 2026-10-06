/**
 * How owners pay StayZim. Payments are manual: the owner pays with their lodge's
 * slug as the reference, sends proof on WhatsApp, and Kin marks them paid.
 *
 * Placeholders until the merchant accounts exist (docs/progress.md, "Blocked on").
 */
export const PAYMENT_METHODS = [
  { key: "paynow", name: "Paynow", short: "Pn", detail: "paynow.co.zw/stayzim", href: "https://www.paynow.co.zw/", tone: "bg-brand-wash text-brand" },
  { key: "ecocash", name: "EcoCash", short: "Ec", detail: "Merchant code 000000", copy: "000000", tone: "bg-danger-tint text-danger" },
  { key: "innbucks", name: "InnBucks", short: "Ib", detail: "Merchant code 000000", copy: "000000", tone: "bg-warning-tint text-warning" },
] as const;

export function formatMoney(dollars: number) {
  return `$${dollars.toFixed(2)}`;
}
