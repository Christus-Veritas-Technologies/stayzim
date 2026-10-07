/**
 * Journal posts are plain text the StayZim team writes: blank lines between
 * paragraphs, and a line starting with "## " is a heading. No HTML, so a post
 * can never inject anything into a lodge's site.
 */

export type PostBlock = { kind: "heading" | "paragraph"; text: string };

/** The post as headings and paragraphs, in order. Line breaks inside a paragraph are kept. */
export function postBlocks(body: string): PostBlock[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith("## ") ? { kind: "heading" as const, text: chunk.slice(3).trim() } : { kind: "paragraph" as const, text: chunk },
    );
}

/** Minutes to read, at 200 words a minute, at least 1. */
export function readMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "12 Sep 2026" for a YYYY-MM-DD date */
export function formatPostDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
