import { describe, expect, test } from "bun:test";

import { smtpOptions } from "./config";

describe("smtpOptions", () => {
  test("is null without a host, so emails print to the console", () => {
    expect(smtpOptions({})).toBeNull();
    expect(smtpOptions({ SMTP_USER: "hello@stayzim.co.zw", SMTP_PASS: "secret" })).toBeNull();
  });

  test("is null without any sender address", () => {
    expect(smtpOptions({ SMTP_HOST: "mail.spacemail.com" })).toBeNull();
  });

  test("defaults to port 587 with STARTTLS, and brands a bare sender", () => {
    expect(smtpOptions({ SMTP_HOST: "mail.spacemail.com", SMTP_USER: "hello@stayzim.co.zw", SMTP_PASS: "secret" })).toEqual({
      host: "mail.spacemail.com",
      port: 587,
      secure: false,
      auth: { user: "hello@stayzim.co.zw", pass: "secret" },
      from: "StayZim <hello@stayzim.co.zw>",
    });
  });

  test("uses implicit TLS on port 465 only", () => {
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: 465, SMTP_FROM: "a@b.co" })?.secure).toBe(true);
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: 25, SMTP_FROM: "a@b.co" })?.secure).toBe(false);
  });

  test("prefers SMTP_FROM, and skips auth unless both user and password are set", () => {
    const options = smtpOptions({ SMTP_HOST: "h", SMTP_USER: "relay", SMTP_FROM: "StayZim <hello@stayzim.co.zw>" });
    expect(options?.from).toBe("StayZim <hello@stayzim.co.zw>");
    expect(options?.auth).toBeUndefined();
  });
});
