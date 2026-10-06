import { describe, expect, test } from "bun:test";

import { invoiceEmail, passwordChangedEmail, receiptEmail, resetPasswordEmail } from "./templates";

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
