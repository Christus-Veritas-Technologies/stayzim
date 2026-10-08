/**
 * Filling and picking copy lines. A line is a sentence with {placeholders};
 * one that needs a fact the lodge hasn't given ({town} with no town) is never
 * used. Which variant a lodge gets comes from a stable hash of its slug, the
 * slot and its copy seed: every lodge reads differently, and the same lodge
 * always reads the same until "Try other wording" bumps the seed.
 */

export type CopyVars = Record<string, string | null | undefined>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** FNV-1a: small, fast and the same everywhere (server, browser, tests). */
export function hash(text: string) {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** The placeholders a line uses. */
export function placeholders(line: string) {
  return [...line.matchAll(PLACEHOLDER)].map((match) => match[1]!);
}

/** True when every placeholder in the line has a value. */
export function canFill(line: string, vars: CopyVars) {
  return placeholders(line).every((key) => Boolean(vars[key]));
}

/** The line with its placeholders filled; unknown ones are left as they are. */
export function fill(line: string, vars: CopyVars) {
  const text = line.replace(PLACEHOLDER, (whole, key: string) => vars[key] ?? whole).trim();
  // "{mornings} and …" starts a sentence with "still mornings": capitalise it
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type Picker = {
  /** One line from the pool, filled, or null when none can be filled (or none fits `max`). */
  one: (slot: string, pool: readonly string[], max?: number) => string | null;
  /** `count` different lines from the pool, filled, in a stable order. */
  some: (slot: string, pool: readonly string[], count: number) => string[];
};

/** Picks for one lodge: `key` is its slug and copy seed. */
export function picker(key: string, vars: CopyVars): Picker {
  function usable(pool: readonly string[], max?: number) {
    return pool.filter((line) => canFill(line, vars)).map((line) => fill(line, vars)).filter((line) => !max || line.length <= max);
  }
  return {
    one(slot, pool, max) {
      const lines = usable(pool, max);
      if (lines.length === 0) return null;
      return lines[hash(`${key}:${slot}`) % lines.length]!;
    },
    some(slot, pool, count) {
      const lines = [...new Set(usable(pool))];
      // A stable shuffle: sort by each line's own hash for this lodge
      return lines
        .map((line) => ({ line, rank: hash(`${key}:${slot}:${line}`) }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, count)
        .map((entry) => entry.line);
    },
  };
}
