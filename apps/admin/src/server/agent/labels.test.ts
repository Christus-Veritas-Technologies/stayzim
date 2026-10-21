import { describe, expect, test } from "bun:test";

import { adLabel } from "./labels";
import type { Qualification } from "./qualify";

const jev = (overrides: Partial<Qualification> = {}): Qualification => ({
  placeToStay: 0.5,
  intent: "just a greeting",
  intentConfidence: 0.6,
  fit: "unclear so far",
  needsHuman: 0.05,
  ...overrides,
});

describe("adLabel", () => {
  test("off-topic, ignored by the gate: Unqualified", () => {
    expect(adLabel({ stage: "NEW", current: null, notAFit: true, jev: jev({ placeToStay: 0.02, intent: "looking for a job, or asking for money or help", intentConfidence: 0.95 }) })).toBe("unqualified");
  });

  test("unsure (a greeting, only asking the price): no label yet", () => {
    expect(adLabel({ stage: "NEW", current: null, jev: jev() })).toBeNull();
    expect(adLabel({ stage: "DETAILS", current: null, jev: jev({ placeToStay: 0.7, intent: "asking a question about StayZim or its prices" }) })).toBeNull();
  });

  test("a lodge owner who sent photos of it: Qualified, and it sticks", () => {
    const photos = jev({ placeToStay: 0.9, photosOfProperty: 0.92, intent: "wants a website for their place to stay" });
    expect(adLabel({ stage: "DETAILS", current: null, jev: photos })).toBe("qualified");
    // Later they say "not now" (the agent goes silent): still Qualified
    expect(adLabel({ stage: "DETAILS", current: "qualified", jev: jev({ placeToStay: 0.6 }) })).toBe("qualified");
    expect(adLabel({ stage: "DISQUALIFIED", current: "qualified", agent: "unqualified" })).toBe("qualified");
  });

  test("photos that aren't of a place to stay don't qualify", () => {
    expect(adLabel({ stage: "DETAILS", current: null, jev: jev({ placeToStay: 0.3, photosOfProperty: 0.05 }) })).toBeNull();
  });

  test("the agent's call: qualified, or unqualified only when nothing better", () => {
    expect(adLabel({ stage: "DETAILS", current: null, agent: "qualified" })).toBe("qualified");
    expect(adLabel({ stage: "NEW", current: null, agent: "unqualified" })).toBe("unqualified");
  });

  test("further along: Pending payment, then Paid; never back down", () => {
    expect(adLabel({ stage: "OFFER", current: null })).toBe("qualified");
    expect(adLabel({ stage: "CHOSEN", current: "qualified" })).toBe("paying");
    expect(adLabel({ stage: "PAID", current: "paying" })).toBe("paid");
    // A failed payment puts them back at CHOSEN; a paid lead stays Paid
    expect(adLabel({ stage: "OFFER", current: "paying" })).toBe("paying");
    expect(adLabel({ stage: "HANDOVER", current: "paid" })).toBe("paid");
  });

  test("Unqualified someone who turns out to have a lodge (Reply anyway, then photos): Qualified", () => {
    expect(adLabel({ stage: "DETAILS", current: "unqualified", jev: jev({ placeToStay: 0.85, photosOfProperty: 0.9 }) })).toBe("qualified");
  });
});
