/**
 * Rooms are priced by the night, unless the room says what its price is for
 * (`priceLabel`): a short rest ("3 hours"), a day rest ("9am to 4pm"), an
 * overnight ("6pm to 9am"). Such a rate is shown with its label and is never
 * booked by the night.
 */
type Priced = { priceLabel?: string | null };

/** Priced by the night (bookable by dates). */
export function isNightly(room: Priced) {
  return !room.priceLabel?.trim();
}

/**
 * What follows the price: "/ night" (or "a night" in words), or "· 3 hours" for
 * a rate with its own label.
 */
export function pricePer(room: Priced, style: "slash" | "words" = "slash") {
  const label = room.priceLabel?.trim();
  if (label) return `· ${label}`;
  return style === "slash" ? "/ night" : "a night";
}
