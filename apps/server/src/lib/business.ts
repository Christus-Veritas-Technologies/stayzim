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
