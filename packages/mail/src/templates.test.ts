import { describe, expect, test } from "bun:test";

import { bookingReceivedEmail, domainClaimedEmail, domainClaimTeamEmail, domainReadyEmail, invoiceEmail, passwordChangedEmail, receiptEmail, resetPasswordEmail } from "./templates";

describe("resetPasswordEmail", () => {
  const url = "https://api.stayzim.co.zw/api/auth/reset-password/abc?callbackURL=https%3A%2F%2Fapp.stayzim.co.zw%2Freset-password";
  const email = resetPasswordEmail({ to: "rudo@mistvalley.co.zw", name: "Rudo Moyo", url });

  test("goes to the owner with a clear subject", () => {
    expect(email.to).toBe("rudo@mistvalley.co.zw");
    expect(email.subject).toBe("Reset your StayZim password");
  });

  test("carries the link in the text and HTML parts", () => {
    expect(email.text).toContain(url);
    // In HTML, & in the link is escaped as &amp;
    expect(email.html).toContain(url.replaceAll("&", "&amp;"));
    expect(email.html).toContain("Hi Rudo,");
  });

  test("escapes names, so they can't inject HTML", () => {
    const sneaky = resetPasswordEmail({ to: "x@y.co", name: '<img src=x onerror="alert(1)">', url });
    expect(sneaky.html).not.toContain("<img src=x");
    expect(sneaky.html).toContain("&lt;img");
  });
});

describe("passwordChangedEmail", () => {
  test("tells the owner what happened, in both parts", () => {
    const email = passwordChangedEmail({ to: "rudo@mistvalley.co.zw", name: "Rudo Moyo" });
    expect(email.subject.toLowerCase()).toContain("password");
    expect(email.text).toContain("Rudo");
    expect(email.html).toContain("Hi Rudo,");
  });
});

describe("billing emails", () => {
  test("invoice subjects follow the reminder", () => {
    const base = { to: "rudo@x.test", name: "Rudo Moyo", lodgeName: "Mist Valley", number: "SZ-2026-00042", plan: "Growth", amount: "$40.00", period: "8 Oct – 8 Nov", due: "Thursday 8 October", payUrl: "https://app.stayzim.co.zw/dashboard/billing" };
    expect(invoiceEmail({ ...base, notice: "DUE_IN_3", demo: false }).subject).toBe("Invoice SZ-2026-00042: $40.00 due on Thursday 8 October");
    expect(invoiceEmail({ ...base, notice: "DUE_IN_1", demo: false }).subject).toBe("Invoice SZ-2026-00042: $40.00 due tomorrow");
    expect(invoiceEmail({ ...base, notice: "DUE_TODAY", demo: true }).subject).toBe("Your Mist Valley demo ends today");
    const email = invoiceEmail({ ...base, notice: "DUE_IN_1", demo: false });
    expect(email.text).toContain("Amount: $40.00");
    expect(email.html).toContain("Pay $40.00");
    // Invoices go from billing@
    expect(email.sender).toBe("billing");
  });

  test("invoices say who issued them, when that's set", () => {
    const base = { to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley", number: "SZ-2026-00042", plan: "Growth", amount: "$40.00", period: "8 Oct – 8 Nov", due: "Thursday 8 October", payUrl: "https://x.test", notice: "DUE_IN_1" as const, demo: false };
    expect(invoiceEmail({ ...base, issuedBy: "StayZim · Mutare, Zimbabwe" }).text).toContain("Issued by StayZim · Mutare, Zimbabwe");
    expect(invoiceEmail(base).text).not.toContain("Issued by");
  });

  test("receipts escape what owners typed", () => {
    const email = receiptEmail({ to: "a@b.test", name: "Rudo", lodgeName: "<b>Lodge</b>", number: "R-2026-00007", amount: "$120.00", plan: "Growth", months: 3, paidOn: "Tue 6 Oct", method: "EcoCash", paidUntil: "Wednesday 6 January", receiptUrl: "https://x.test/r" });
    expect(email.html).toContain("&lt;b&gt;Lodge&lt;/b&gt;");
    expect(email.text).toContain("Plan: Growth, 3 months");
  });
});

describe("booking emails to guests", () => {
  const stay = { lodgeName: "Mist Valley Lodge", roomName: "River Suite", dates: "12–15 Nov", nights: 3, guests: 2, total: "$360", reference: "B-7K2Q" };

  test("a request the lodge still has to confirm: sent, not held, nothing charged, replies to the lodge", () => {
    const email = bookingReceivedEmail({ ...stay, to: "sarah@x.test", guestName: "Sarah Test", lodgeWhatsappUrl: "https://wa.me/263771234567", replyTo: "hello@mistvalley.test" });
    expect(email.subject).toBe("We sent your request to Mist Valley Lodge");
    expect(email.text).toContain("aren't held until then");
    expect(email.text).toContain("Reference: B-7K2Q");
    expect(email.replyTo).toBe("hello@mistvalley.test");
    // From the main (no-reply) sender, not billing@
    expect(email.sender).toBeUndefined();
    expect(email.html).toContain("WhatsApp the lodge");
  });

  test("every email has the StayZim frame: the mark, the name and the brand line", () => {
    const email = bookingReceivedEmail({ ...stay, to: "sarah@x.test", guestName: "Sarah", lodgeWhatsappUrl: null });
    expect(email.html).toContain("/email/stayzim-mark.png");
    expect(email.html).toContain(">StayZim</span>");
    expect(email.html).toContain("max-width:480px");
  });
});

describe("free domain emails", () => {
  const claim = { lodgeName: "Mist Valley Lodge", domain: "mistvalleylodge.co.zw", readyBy: "Sunday 11 October, 14:05" };

  test("the owner hears when it'll be ready, and that we'll WhatsApp and email", () => {
    const email = domainClaimedEmail({ ...claim, to: "rudo@x.test", name: "Rudo Moyo", dashboardUrl: "https://stayzim.co.zw/dashboard" });
    expect(email.subject).toBe("mistvalleylodge.co.zw is on its way");
    expect(email.text).toContain("ready within 72 hours");
    expect(email.text).toContain("WhatsApp and email you");
    expect(email.html).toContain("Sunday 11 October, 14:05");
  });

  test("the team gets the set-domain command", () => {
    const email = domainClaimTeamEmail({ ...claim, to: "hello@stayzim.co.zw", slug: "mistvalley", plan: "Growth", ownerName: "Rudo Moyo", ownerEmail: "rudo@x.test", whatsapp: null });
    expect(email.text).toContain("set-domain --slug mistvalley --domain mistvalleylodge.co.zw");
    expect(email.text).toContain("WhatsApp: Not given");
  });

  test("the owner hears when it's live", () => {
    const email = domainReadyEmail({ to: "rudo@x.test", name: "Rudo", lodgeName: "Mist Valley Lodge", domain: "mistvalleylodge.co.zw" });
    expect(email.subject).toBe("mistvalleylodge.co.zw is live");
    expect(email.html).toContain("https://mistvalleylodge.co.zw");
  });
});
