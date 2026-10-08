/**
 * What an owner tells /create about their place (type, setting, size, price),
 * on top of the name, town and country. The copy engine (../copy) writes the
 * site's text from these, and the example rooms are sized and priced from them.
 */

export const LODGE_KINDS = {
  lodge: { label: "Lodge", noun: "lodge", plural: "lodges" },
  guesthouse: { label: "Guesthouse", noun: "guesthouse", plural: "guesthouses" },
  bnb: { label: "B&B", noun: "B&B", plural: "B&Bs" },
  "holiday-home": { label: "Holiday home", noun: "holiday home", plural: "holiday homes" },
  camp: { label: "Safari camp", noun: "camp", plural: "camps" },
  hotel: { label: "Hotel", noun: "hotel", plural: "hotels" },
  "self-catering": { label: "Self-catering", noun: "self-catering stay", plural: "self-catering stays" },
} as const;

export type LodgeKind = keyof typeof LODGE_KINDS;
export const LODGE_KIND_KEYS = Object.keys(LODGE_KINDS) as [LodgeKind, ...LodgeKind[]];

export const SETTINGS = {
  mountains: { label: "Mountains", hint: "Highlands, forest, cool evenings" },
  lake: { label: "Lake or dam", hint: "Water views and sunsets" },
  bush: { label: "Bush or safari", hint: "Wildlife and wide skies" },
  river: { label: "River", hint: "Water, birds and shade" },
  city: { label: "Town or city", hint: "Close to everything" },
  farm: { label: "Farm or countryside", hint: "Open land and quiet" },
} as const;

export type Setting = keyof typeof SETTINGS;
export const SETTING_KEYS = Object.keys(SETTINGS) as [Setting, ...Setting[]];

/** Typical nightly prices offered on /create, in whole USD. */
export const PRICE_HINTS = [30, 50, 80, 120, 200] as const;

export const FACT_LIMITS = { country: 60, roomsMax: 60, priceMin: 5, priceMax: 5000 } as const;

export const DEFAULT_COUNTRY = "Zimbabwe";

/** Suggested on /create and the dashboard; any town can be typed. */
export const ZIMBABWE_TOWNS = [
  "Harare",
  "Bulawayo",
  "Victoria Falls",
  "Kariba",
  "Nyanga",
  "Juliasdale",
  "Mutare",
  "Bvumba",
  "Chimanimani",
  "Masvingo",
  "Gweru",
  "Kwekwe",
  "Kadoma",
  "Hwange",
  "Binga",
  "Chinhoyi",
  "Marondera",
  "Rusape",
  "Bindura",
  "Beitbridge",
  "Zvishavane",
  "Chiredzi",
  "Gokwe",
] as const;

/** Countries StayZim lodges are in; any can be typed. */
export const COUNTRIES = ["Zimbabwe", "Zambia", "Botswana", "Mozambique", "South Africa", "Malawi", "Namibia"] as const;

export function isLodgeKind(value: unknown): value is LodgeKind {
  return typeof value === "string" && Object.hasOwn(LODGE_KINDS, value);
}

export function isSetting(value: unknown): value is Setting {
  return typeof value === "string" && Object.hasOwn(SETTINGS, value);
}
