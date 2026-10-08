/**
 * Writes every email to an HTML file, with made-up details, to check how they
 * look (in a browser at phone and desktop widths) without sending anything.
 *
 *   WEB_URL=http://localhost:9999 bun scripts/preview-emails.ts /tmp/emails
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  bookingClosedEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  bookingRequestEmail,
  demoEndedEmail,
  demoWelcomeEmail,
  domainClaimedEmail,
  domainClaimTeamEmail,
  domainReadyEmail,
  invoiceEmail,
  passwordChangedEmail,
  receiptEmail,
  resetPasswordEmail,
  siteOfflineEmail,
} from "../src/templates";

const out = process.argv[2] ?? "email-previews";
mkdirSync(out, { recursive: true });

const stay = { lodgeName: "Mist Valley Lodge", roomName: "River Suite", dates: "12–15 Nov", nights: 3, guests: 2, total: "$360", reference: "B-7K2Q" };
const emails = {
  "reset-password": resetPasswordEmail({ to: "rudo@x.test", name: "Rudo Moyo", url: "https://api.stayzim.co.zw/api/auth/reset-password/abc" }),
  "password-changed": passwordChangedEmail({ to: "rudo@x.test", name: "Rudo Moyo" }),
  "demo-welcome": demoWelcomeEmail({ to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley Lodge", siteUrl: "https://mistvalley.stayzim.co.zw", dashboardUrl: "https://stayzim.co.zw/dashboard", plan: "Growth", price: "$40", endsAt: "Saturday 10 October at 09:46" }),
  invoice: invoiceEmail({ to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley Lodge", notice: "DUE_IN_1", demo: false, number: "SZ-2026-00042", plan: "Growth", amount: "$40.00", period: "8 Oct – 8 Nov", due: "Thursday 8 October", payUrl: "https://stayzim.co.zw/dashboard/billing", issuedBy: "StayZim Platform Inc · stayzim.co.zw" }),
  receipt: receiptEmail({ to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley Lodge", number: "R-2026-00007", amount: "$120.00", plan: "Growth", months: 3, paidOn: "Tue 6 Oct", method: "EcoCash", paidUntil: "Wednesday 6 January", receiptUrl: "https://stayzim.co.zw/dashboard/billing/R-2026-00007", issuedBy: "StayZim Platform Inc · stayzim.co.zw" }),
  "demo-ended": demoEndedEmail({ to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley Lodge", payUrl: "https://stayzim.co.zw/dashboard/billing", keptUntil: "Monday 9 November" }),
  "site-offline": siteOfflineEmail({ to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley Lodge", amount: "$40.00", payUrl: "https://stayzim.co.zw/dashboard/billing" }),
  "booking-request": bookingRequestEmail({ ...stay, to: "rudo@x.test", ownerName: "Rudo Moyo", guestName: "Sarah Test", guestPhone: "+44 7700 900123", guestWhatsappUrl: "https://wa.me/447700900123", message: "We'll arrive late, around 9pm. Is that alright?", requestsUrl: "https://stayzim.co.zw/dashboard/bookings?tab=requests" }),
  "booking-received": bookingReceivedEmail({ ...stay, to: "sarah@x.test", guestName: "Sarah Test", lodgeWhatsappUrl: "https://wa.me/263771234567" }),
  "booking-confirmed": bookingConfirmedEmail({ ...stay, to: "sarah@x.test", guestName: "Sarah Test", times: "Check-in from 14:00 · Check-out by 10:00", lodgeWhatsappUrl: "https://wa.me/263771234567" }),
  "booking-declined": bookingClosedEmail({ ...stay, to: "sarah@x.test", guestName: "Sarah Test", kind: "declined", reason: "We're fully booked for a wedding that weekend. Sorry!", siteUrl: "https://mistvalley.stayzim.co.zw" }),
  "domain-claimed": domainClaimedEmail({ to: "rudo@x.test", name: "Rudo Moyo", lodgeName: "Mist Valley Lodge", domain: "mistvalleylodge.co.zw", readyBy: "Sunday 11 October, 14:05", dashboardUrl: "https://stayzim.co.zw/dashboard" }),
  "domain-claim-team": domainClaimTeamEmail({ to: "hello@stayzim.co.zw", lodgeName: "Mist Valley Lodge", slug: "mistvalley", plan: "Growth", ownerName: "Rudo Moyo", ownerEmail: "rudo@x.test", whatsapp: "263771234567", domain: "mistvalleylodge.co.zw", readyBy: "Sunday 11 October, 14:05" }),
  "domain-ready": domainReadyEmail({ to: "rudo@x.test", name: "Rudo Moyo", lodgeName: "Mist Valley Lodge", domain: "mistvalleylodge.co.zw" }),
};

for (const [name, email] of Object.entries(emails)) {
  writeFileSync(join(out, `${name}.html`), email.html ?? "");
  writeFileSync(join(out, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}`);
}
console.log(`${Object.keys(emails).length} emails written to ${out}`);
