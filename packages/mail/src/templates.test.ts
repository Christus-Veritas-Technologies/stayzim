import { describe, expect, test } from "bun:test";

import { passwordChangedEmail, resetPasswordEmail } from "./templates";

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
