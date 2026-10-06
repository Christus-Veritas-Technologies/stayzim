const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "R-7K2Q", "B-9XQ4": short, easy to read out on the phone, no 0/O or 1/I. */
export function newReference(prefix: string, length = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return `${prefix}-${[...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
}
