import { describe, expect, test } from "bun:test";

import { gate, toQualification, type Qualification } from "./qualify";

const lead = (overrides: Partial<Qualification> = {}): Qualification => ({
  placeToStay: 0.9,
  intent: "wants a website for their place to stay",
  intentConfidence: 0.9,
  fit: "an operating lodge, guesthouse or rental",
  needsHuman: 0.05,
  ...overrides,
});

describe("gate", () => {
  test("a real lodge carries on (Hardy House: 40 rooms in different places, catalogue links)", () => {
    expect(gate(lead({ fit: "established, with several rooms or properties" }), null, "DETAILS").action).toBe("continue");
  });

  test("a bare greeting from the ad carries on: we don't know yet", () => {
    expect(gate(lead({ placeToStay: 0.4, intent: "just a greeting", intentConfidence: 0.7, fit: "unclear so far" }), null, "NEW").action).toBe("continue");
  });

  test("spam, job seekers and wrong numbers are ignored when it's clear", () => {
    expect(gate(lead({ placeToStay: 0.02, intent: "selling something to us, or spam", intentConfidence: 0.95, fit: "not a place to stay" }), null, "NEW")).toEqual({
      action: "ignore",
      reason: "selling something to us, or spam",
    });
    expect(gate(lead({ placeToStay: 0.05, intent: "looking for a job, or asking for money or help", intentConfidence: 0.9, fit: "not a place to stay" }), null, "NEW").action).toBe("ignore");
  });

  test("when Jev isn't sure, we carry on", () => {
    expect(gate(lead({ placeToStay: 0.1, intent: "wrong number, or nothing to do with a place to stay", intentConfidence: 0.6, fit: "unclear so far" }), null, "NEW").action).toBe("continue");
  });

  test("not a place to stay twice in a row is ignored, once isn't", () => {
    const weak = lead({ placeToStay: 0.1, intent: "just a greeting", intentConfidence: 0.6, fit: "not a place to stay" });
    expect(gate(weak, null, "DETAILS").action).toBe("continue");
    expect(gate(weak, weak, "DETAILS").action).toBe("ignore");
  });

  test("photos of something else, with no sign of a lodge, are ignored", () => {
    expect(gate(lead({ placeToStay: 0.1, photosOfProperty: 0.03, intent: "just a greeting", fit: "unclear so far" }), null, "DETAILS").action).toBe("ignore");
  });

  test("once we've made their sites, they're never ignored", () => {
    const junkLooking = lead({ placeToStay: 0.02, intent: "wrong number, or nothing to do with a place to stay", intentConfidence: 0.95, fit: "not a place to stay" });
    expect(gate(junkLooking, junkLooking, "OFFER").action).toBe("continue");
  });

  test("stop means stop, and upset or payment trouble goes to a person", () => {
    expect(gate(lead({ intent: "wants us to stop messaging", intentConfidence: 0.8 }), null, "OFFER").action).toBe("stop");
    expect(gate(lead({ needsHuman: 0.85 }), null, "PAYING").action).toBe("handover");
  });
});

describe("toQualification", () => {
  test("reads Jev's answers", () => {
    const q = toQualification({
      place_to_stay: { type: "noul", probability: 0.83 },
      intent: { type: "choice", selected: "wants a website for their place to stay", probabilities: {}, confidence: 0.9 },
      fit: { type: "score", selected: "established, with several rooms or properties", probabilities: {}, confidence: 0.7 },
      needs_human: { type: "noul", probability: 0.1 },
      photos_of_property: { type: "noul", probability: 0.95 },
    });
    expect(q).toEqual({
      placeToStay: 0.83,
      intent: "wants a website for their place to stay",
      intentConfidence: 0.9,
      fit: "established, with several rooms or properties",
      needsHuman: 0.1,
      photosOfProperty: 0.95,
    });
  });
});
