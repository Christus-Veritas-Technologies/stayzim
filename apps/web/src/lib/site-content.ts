import type { SiteRoom } from "@stayzim/sites";

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
