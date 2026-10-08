import type { LiveSite, SiteRoom } from "@stayzim/sites";

/**
 * Wording every template shares, so a room or a stay reads the same in Classic
 * and in the designer's templates (docs/cms/README.md, "The template contract").
 */

/**
 * Where a photo is missing: a soft wash of the lodge's colour (templates set
 * --theme). Here, not in a client module, so server templates get the string.
 */
export const PHOTO_FALLBACK =
  "bg-[linear-gradient(160deg,color-mix(in_oklab,var(--theme,#1E4A3B)_18%,#F4EFE6)_0%,color-mix(in_oklab,var(--theme,#1E4A3B)_55%,#8A7A66)_100%)]";

/** "32 m²" */
export function formatSize(size: number) {
  return `${size} m²`;
}

/** The room's facts, in order: ["Sleeps 4", "1 queen + 2 singles", "32 m²"]. */
export function roomFacts(room: Pick<SiteRoom, "sleeps" | "beds" | "size">) {
  return [`Sleeps ${room.sleeps}`, room.beds, room.size === null ? null : formatSize(room.size)].filter(
    (fact): fact is string => Boolean(fact),
  );
}

/** "Check-in from 14:00 · Check-out by 10:00", or null when neither is set. */
export function stayFacts(site: Pick<LiveSite, "checkInFrom" | "checkOutBy">) {
  const facts = [site.checkInFrom && `Check-in from ${site.checkInFrom}`, site.checkOutBy && `Check-out by ${site.checkOutBy}`].filter(Boolean);
  return facts.length > 0 ? facts.join(" · ") : null;
}

/** Whether the site has anything for its Good to know section. */
export function hasStayInfo(site: Pick<LiveSite, "checkInFrom" | "checkOutBy" | "houseRules" | "cancellationPolicy">) {
  return Boolean(site.checkInFrom || site.checkOutBy || site.houseRules.length > 0 || site.cancellationPolicy);
}

/** A piece of hero text, and whether the owner starred it ("A *quiet* stay"). */
export type TextPart = { text: string; em: boolean };

/**
 * Hero text split on *stars*, so templates can set the starred words apart
 * (bolder, italic or in the lodge's colour). Unpaired stars stay as typed.
 */
export function emphasis(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const pattern = /\*([^*]+)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), em: false });
    parts.push({ text: match[1]!, em: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), em: false });
  return parts.length > 0 ? parts : [{ text, em: false }];
}

/** Hero text without the stars, for titles, previews and screen readers. */
export function plainText(text: string) {
  return emphasis(text)
    .map((part) => part.text)
    .join("");
}

/**
 * The lodge description as a welcome: its first sentence as the heading when
 * that reads like one (up to 110 characters), the rest as the paragraph.
 */
export function splitIntro(description: string): { heading: string | null; body: string | null } {
  const text = description.trim();
  if (!text) return { heading: null, body: null };
  const end = text.search(/[.!?](\s|$)/);
  const first = end === -1 ? text : text.slice(0, end + 1);
  if (first.length > 110) return { heading: null, body: text };
  const rest = text.slice(first.length).trim();
  return { heading: first.replace(/\.$/, ""), body: rest || null };
}

/** Each amenity across the rooms, most common first: "Fireplace, in all 4 rooms". */
export function amenitySummary(rooms: Pick<SiteRoom, "amenities">[]) {
  const counts = new Map<SiteRoom["amenities"][number], number>();
  for (const room of rooms) for (const key of new Set(room.amenities)) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({
      key,
      count,
      where: count === rooms.length ? (rooms.length === 1 ? "In the room" : `In all ${rooms.length} rooms`) : `In ${count} ${count === 1 ? "room" : "rooms"}`,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Room numbers for the intro: how many, the most a room sleeps, and the lowest price. */
export function roomStats(rooms: Pick<SiteRoom, "price" | "sleeps">[]) {
  if (rooms.length === 0) return null;
  const sleeps = rooms.map((room) => room.sleeps);
  return {
    count: rooms.length,
    fewest: Math.min(...sleeps),
    most: Math.max(...sleeps),
    from: Math.min(...rooms.map((room) => room.price)),
  };
}

/**
 * The description with the given words picked out ("a private deck, air con
 * and a braai"), for intros that set the lodge's amenities apart.
 */
export function highlightWords(text: string, words: string[]): TextPart[] {
  const wanted = words.map((word) => word.trim()).filter((word) => word.length > 2);
  if (wanted.length === 0) return [{ text, em: false }];
  const escaped = wanted.sort((a, b) => b.length - a.length).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), em: false });
    parts.push({ text: match[0], em: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), em: false });
  return parts.length > 0 ? parts : [{ text, em: false }];
}

/** Booking.com's words for a score out of 10. */
export function scoreWord(score: number) {
  if (score >= 9.5) return "Exceptional";
  if (score >= 9) return "Superb";
  if (score >= 8.6) return "Fabulous";
  if (score >= 8) return "Very good";
  if (score >= 7) return "Good";
  return "Rated";
}

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** "Four rooms", "One room", "14 rooms" */
export function countWords(count: number, noun: string, plural = `${noun}s`) {
  return `${COUNT_WORDS[count] ?? count} ${count === 1 ? noun : plural}`;
}

/** What a site says when it has no rooms to show (generated, with a plain fallback). */
export function roomsEmpty(site: Pick<LiveSite, "copy">) {
  return site.copy.rooms.empty || "Rooms are coming soon. Message us on WhatsApp to book.";
}

/** The line under a rooms heading: generated for the lodge, or the plain one. */
export function roomsIntro(site: Pick<LiveSite, "copy">) {
  return site.copy.rooms.intro || "Prices are per room, per night.";
}
