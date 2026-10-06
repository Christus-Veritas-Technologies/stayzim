import { eachNight, staysOverlap } from "./dates";

/** Something that takes rooms of one type: a confirmed stay, or closed dates. */
export type Hold = { checkIn: string; checkOut: string; quantity: number };

/** Rooms taken on each night from `from` up to (not including) `to`. */
export function occupancy(holds: readonly Hold[], from: string, to: string): Map<string, number> {
  const taken = new Map<string, number>();
  for (const night of eachNight(from, to)) taken.set(night, 0);
  for (const hold of holds) {
    if (!staysOverlap(hold, { checkIn: from, checkOut: to })) continue;
    for (const night of eachNight(hold.checkIn > from ? hold.checkIn : from, hold.checkOut < to ? hold.checkOut : to)) {
      taken.set(night, (taken.get(night) ?? 0) + hold.quantity);
    }
  }
  return taken;
}

/** Nights in the window when every one of the `units` rooms is taken. */
export function fullNights(units: number, holds: readonly Hold[], from: string, to: string): string[] {
  return [...occupancy(holds, from, to)].filter(([, taken]) => taken >= units).map(([night]) => night);
}

/** Nights with more taken than the lodge has (after "how many" went down). */
export function overbookedNights(units: number, holds: readonly Hold[], from: string, to: string) {
  return [...occupancy(holds, from, to)].filter(([, taken]) => taken > units).map(([night, taken]) => ({ night, taken }));
}

/** Whether `quantity` more rooms fit for the whole stay; if not, the first night that's full. */
export function canHold(
  units: number,
  holds: readonly Hold[],
  stay: { checkIn: string; checkOut: string; quantity: number },
): { ok: true } | { ok: false; fullOn: string } {
  for (const [night, taken] of occupancy(holds, stay.checkIn, stay.checkOut)) {
    if (taken + stay.quantity > units) return { ok: false, fullOn: night };
  }
  return { ok: true };
}

/** Whether this hold leaves no room free on some night of the stay ("this fills your last room"). */
export function fillsLast(units: number, holds: readonly Hold[], stay: { checkIn: string; checkOut: string; quantity: number }) {
  for (const [night, taken] of occupancy(holds, stay.checkIn, stay.checkOut)) {
    if (taken + stay.quantity === units) return night;
  }
  return null;
}
