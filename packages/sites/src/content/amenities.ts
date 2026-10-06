/** The amenities an owner can tick on a room. Web adds an icon for each (apps/web/src/lib/lodge.ts). */
export const AMENITY_LABELS = {
  wifi: "Wi-Fi",
  braai: "Braai",
  fireplace: "Fireplace",
  parking: "Parking",
  kitchen: "Kitchen",
  breakfast: "Breakfast",
  bath: "Bath",
  aircon: "Air con",
  pool: "Pool",
  tv: "TV",
} as const;

export type AmenityKey = keyof typeof AMENITY_LABELS;

export const AMENITY_KEYS = Object.keys(AMENITY_LABELS) as [AmenityKey, ...AmenityKey[]];

export function isAmenity(value: string): value is AmenityKey {
  return value in AMENITY_LABELS;
}
