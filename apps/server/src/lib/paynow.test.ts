import { describe, expect, test } from "bun:test";

import { parsePaynowFields, paymentOutcome, paynowHash, verifyPaynowHash } from "./paynow";

const KEY = "3E9FED89-60E1-4CE5-AB6E-6B1EB2D4F977";

describe("paynow", () => {
  test("hash: values in order, then the key in lowercase, SHA-512 in uppercase", () => {
    const fields = { id: "1201", reference: "SZ-P-ABC123", amount: "40.00", status: "Message" };
    const expected = new Bun.CryptoHasher("sha512").update(`1201SZ-P-ABC12340.00Message${KEY.toLowerCase()}`).digest("hex").toUpperCase();
    expect(paynowHash(fields, KEY)).toBe(expected);
    expect(paynowHash({ ...fields, hash: "ignored" }, KEY)).toBe(expected);
  });

  test("a result POST is checked against its own hash, in the order it came", () => {
    const fields = { reference: "SZ-P-ABC123", paynowreference: "998877", amount: "40.00", status: "Paid", pollurl: "https://www.paynow.co.zw/Interface/CheckPayment/?guid=1" };
    const body = new URLSearchParams({ ...fields, hash: paynowHash(fields, KEY) }).toString();
    const parsed = parsePaynowFields(body);
    expect(parsed.pollurl).toBe(fields.pollurl);
    expect(verifyPaynowHash(parsed, KEY)).toBe(true);
    expect(verifyPaynowHash({ ...parsed, amount: "0.01" }, KEY)).toBe(false);
    expect(verifyPaynowHash({ ...parsed, hash: "" }, KEY)).toBe(false);
  });

  test("Paynow's status words", () => {
    expect(paymentOutcome("Paid")).toBe("PAID");
    expect(paymentOutcome("Awaiting Delivery")).toBe("PAID");
    expect(paymentOutcome("Sent")).toBe("PENDING");
    expect(paymentOutcome("Cancelled")).toBe("CANCELLED");
    expect(paymentOutcome("Failed")).toBe("FAILED");
  });
});
