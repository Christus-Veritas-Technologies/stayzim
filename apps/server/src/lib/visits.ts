/** A guest's visit ends after this long without another page view or tap. */
export const VISIT_GAP_MS = 30 * 60 * 1000;

/**
 * The events of one visit around `eventId`: starting from that event, walks
 * out in both directions while the gaps between events stay within
 * VISIT_GAP_MS. `events` are one guest's, oldest first. Empty if the event
 * isn't among them.
 */
export function visitAround<T extends { id: string; createdAt: Date }>(events: T[], eventId: string, gapMs = VISIT_GAP_MS): T[] {
  const index = events.findIndex((event) => event.id === eventId);
  if (index === -1) return [];
  const gap = (from: number, to: number) => events[to]!.createdAt.getTime() - events[from]!.createdAt.getTime();
  let first = index;
  let last = index;
  while (first > 0 && gap(first - 1, first) <= gapMs) first--;
  while (last < events.length - 1 && gap(last, last + 1) <= gapMs) last++;
  return events.slice(first, last + 1);
}
