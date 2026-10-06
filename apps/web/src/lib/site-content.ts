import type { LiveSite, SiteRoom } from "@stayzim/sites";

/**
 * Wording every template shares, so a room or a stay reads the same in Classic
 * and in the designer's templates (docs/cms/README.md, "The template contract").
 */

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
