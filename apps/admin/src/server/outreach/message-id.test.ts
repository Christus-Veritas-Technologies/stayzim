import { describe, expect, test } from "bun:test";

import { messageId } from "./whatsapp";

describe("messageId", () => {
  test("uses _serialized when WhatsApp fills it in", () => {
    expect(messageId({ _serialized: "false_263771234567@c.us_3EB0AB", id: "3EB0AB" })).toBe("false_263771234567@c.us_3EB0AB");
  });
  test("builds the same text from the key's parts when _serialized is missing", () => {
    expect(messageId({ fromMe: false, remote: { user: "57321287889014", server: "lid" }, id: "AC5F12" })).toBe("false_57321287889014@lid_AC5F12");
    expect(messageId({ fromMe: true, remote: "263771234567@c.us", id: "3EB0AB" })).toBe("true_263771234567@c.us_3EB0AB");
    expect(messageId({ fromMe: false, id: "AC5F12" }, "57321287889014@lid")).toBe("false_57321287889014@lid_AC5F12");
  });
  test("never the text undefined", () => {
    expect(messageId(undefined)).toBeUndefined();
    expect(messageId("undefined")).toBeUndefined();
    expect(messageId({ _serialized: "undefined" })).toBeUndefined();
    expect(messageId({ fromMe: false })).toBeUndefined();
  });
});
