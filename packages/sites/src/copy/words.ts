/**
 * Words each setting and type of place brings to the copy. Kept to what the
 * owner told us: a lake lodge has water to look at; nothing here claims a
 * pool, Wi-Fi or a game drive the lodge may not offer.
 */
import type { LodgeKind, Setting } from "../content/facts";

export type SettingWords = {
  /** "the hills": what guests look out at */
  view: string;
  /** "misty mornings" */
  mornings: string;
  /** "evenings by the fire" */
  evenings: string;
  /** "the highlands": the kind of country around */
  country: string;
  /** "cool, clear air": one sensory line */
  air: string;
  /** "walks", things to do, as nouns */
  doing: string;
};

export const SETTING_WORDS: Record<Setting, SettingWords> = {
  mountains: {
    view: "the hills",
    mornings: "misty mornings",
    evenings: "evenings by the fire",
    country: "the highlands",
    air: "cool, clear mountain air",
    doing: "walks and waterfalls",
  },
  lake: {
    view: "the water",
    mornings: "still mornings on the water",
    evenings: "sunsets over the lake",
    country: "the lakeshore",
    air: "a breeze off the water",
    doing: "boat trips and fishing",
  },
  bush: {
    view: "the bush",
    mornings: "early mornings with the birds",
    evenings: "nights under wide skies",
    country: "the bush",
    air: "the smell of the bush after rain",
    doing: "game viewing and bush walks",
  },
  river: {
    view: "the river",
    mornings: "mornings with the river birds",
    evenings: "evenings by the river",
    country: "the riverbank",
    air: "shade and the sound of water",
    doing: "fishing and riverside walks",
  },
  city: {
    view: "the city",
    mornings: "an easy start to the day",
    evenings: "quiet evenings after a busy day",
    country: "town",
    air: "calm, close to everything",
    doing: "shops, restaurants and meetings",
  },
  farm: {
    view: "the fields",
    mornings: "slow farm mornings",
    evenings: "big skies at sunset",
    country: "the countryside",
    air: "fresh country air",
    doing: "farm walks and fresh produce",
  },
};

/** For a lodge that hasn't said where it is: true of any good place to stay. */
export const NEUTRAL_WORDS: SettingWords = {
  view: "the view",
  mornings: "slow mornings",
  evenings: "quiet evenings",
  country: "the area",
  air: "peace and quiet",
  doing: "the sights nearby",
};

export type KindWords = {
  /** "lodge", inside a sentence */
  noun: string;
  /** "lodges" */
  plural: string;
  /** "Lodge", at the start of a sentence */
  label: string;
  /** What staying here feels like, in a few words: "a lodge run by people who live here" */
  host: string;
  /** What the rooms are called: "rooms", "cottages", "tents" */
  rooms: string;
  /** One of them: "room", "cottage", "tent" */
  room: string;
};

export const KIND_WORDS: Record<LodgeKind, KindWords> = {
  lodge: { noun: "lodge", plural: "lodges", label: "Lodge", host: "a lodge run by people who know the area", rooms: "rooms", room: "room" },
  guesthouse: { noun: "guesthouse", plural: "guesthouses", label: "Guesthouse", host: "a friendly guesthouse with a personal welcome", rooms: "rooms", room: "room" },
  bnb: { noun: "B&B", plural: "B&Bs", label: "B&B", host: "a B&B where breakfast is part of the stay", rooms: "rooms", room: "room" },
  "holiday-home": { noun: "holiday home", plural: "holiday homes", label: "Holiday home", host: "a whole home to yourselves", rooms: "rooms", room: "room" },
  camp: { noun: "camp", plural: "camps", label: "Camp", host: "a small camp close to nature", rooms: "tents and chalets", room: "tent" },
  hotel: { noun: "hotel", plural: "hotels", label: "Hotel", host: "a hotel with the comforts you need", rooms: "rooms", room: "room" },
  "self-catering": {
    noun: "self-catering stay",
    plural: "self-catering stays",
    label: "Self-catering",
    host: "your own space, with a kitchen to cook in",
    rooms: "units",
    room: "unit",
  },
};

export const NEUTRAL_KIND: KindWords = { noun: "place", plural: "places", label: "Our place", host: "a place to rest", rooms: "rooms", room: "room" };
