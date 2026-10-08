import { describe, expect, test } from "bun:test";

import { siteDraftSchema } from "./content/schemas";
import { applyDraft } from "./content/draft";
import { sampleSite } from "./samples/site";

const base = { roomsHint: 4, priceHint: 80, copySeed: 0 };
const demo = sampleSite({ template: "growth-shoreline", name: "Kudu Hill", town: "Kariba", country: "Zimbabwe", kind: "lodge", setting: "lake", roomsHint: 4, priceHint: 80, themeColor: "#1E4A3B", today: "2026-10-08" });

describe("applyDraft", () => {
  test("an empty draft changes nothing", () => {
    expect(applyDraft(demo, {}, base)).toEqual(demo);
  });

  test("the owner's hero text and colour show before saving", () => {
    const site = applyDraft(demo, { heroHeadline: "Sunsets on *Kariba*", themeColor: "#336699" }, base);
    expect(site.hero.headline).toBe("Sunsets on *Kariba*");
    expect(site.themeColor).toBe("#336699");
  });

  test("clearing the headline goes back to our wording", () => {
    expect(applyDraft(demo, { heroHeadline: "" }, base).hero.headline).toBe(demo.copy.hero.headline);
  });

  test("new facts write the copy again, and our hero follows it", () => {
    const site = applyDraft(demo, { setting: "mountains", town: "Nyanga" }, base);
    expect(site.setting).toBe("mountains");
    expect(site.copy).not.toEqual(demo.copy);
    expect(site.hero.headline).toBe(site.copy.hero.headline);
  });

  test("guest info replaces the examples, and clearing it brings them back on a demo", () => {
    const filled = applyDraft(demo, { checkInFrom: "15:00", checkOutBy: null, houseRules: ["No pets"], cancellationPolicy: "", faq: [] }, base);
    expect(filled.checkInFrom).toBe("15:00");
    expect(filled.houseRules).toEqual(["No pets"]);
    expect(filled.samples.guestInfo).toBe(false);
    const cleared = applyDraft(filled, { checkInFrom: null, checkOutBy: null, houseRules: [], cancellationPolicy: null, faq: [] }, base);
    expect(cleared.samples.guestInfo).toBe(true);
    expect(cleared.checkInFrom).toBe("14:00");
  });

  test("a half-typed or broken draft parses, with the broken fields left out", () => {
    const draft = siteDraftSchema.parse({ name: "", themeColor: "blue", kind: "castle", heroHeadline: "Hi" });
    const site = applyDraft(demo, draft, base);
    expect(site.name).toBe("Kudu Hill");
    expect(site.themeColor).toBe(demo.themeColor);
    expect(site.kind).toBe("lodge");
    expect(site.hero.headline).toBe("Hi");
  });
});
