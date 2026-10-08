import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Share cards (Open Graph) are 1200×630, the size WhatsApp, Facebook and X show best. */
export const OG_SIZE = { width: 1200, height: 630 };

/** Cached for a day at the edge; the ?v= in each card's address changes when what it shows does. */
export const OG_HEADERS = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };

type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" };

const fonts = new Map<string, Promise<ArrayBuffer | null>>();

/**
 * A Google font as TTF (what ImageResponse reads), fetched once per process.
 * Null when Google can't be reached; the card then uses the built-in font.
 */
function googleFont(family: string, weight: number) {
  const key = `${family}:${weight}`;
  let font = fonts.get(key);
  if (!font) {
    font = (async () => {
      try {
        // Without a modern browser's user agent, Google answers with TTF files
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weight}`, { signal: AbortSignal.timeout(3000) })).text();
        const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
        if (!url) return null;
        return await (await fetch(url, { signal: AbortSignal.timeout(3000) })).arrayBuffer();
      } catch {
        return null;
      }
    })();
    fonts.set(key, font);
  }
  return font;
}

/** StayZim's fonts for the cards: Familjen Grotesk for names, Instrument Sans for the rest. */
export async function ogFonts(): Promise<Font[]> {
  const [display, sans, sansBold] = await Promise.all([googleFont("Familjen Grotesk", 700), googleFont("Instrument Sans", 400), googleFont("Instrument Sans", 600)]);
  return [
    ...(display ? [{ name: "Familjen Grotesk", data: display, weight: 700 as const, style: "normal" as const }] : []),
    ...(sans ? [{ name: "Instrument Sans", data: sans, weight: 400 as const, style: "normal" as const }] : []),
    ...(sansBold ? [{ name: "Instrument Sans", data: sansBold, weight: 600 as const, style: "normal" as const }] : []),
  ];
}

/**
 * A photo as a data URL for the card, or null: JPEG and PNG only (what the card
 * renderer reads), and never more than 4 seconds or 6 MB, so a slow photo
 * gives a card without it rather than no card.
 */
export async function ogPhoto(url: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const data = await response.arrayBuffer();
    if (data.byteLength > 6 * 1024 * 1024) return null;
    return `data:${type.split(";")[0]};base64,${Buffer.from(data).toString("base64")}`;
  } catch {
    return null;
  }
}

/** The StayZim mark (public/email/stayzim-mark.png) as a data URL, or null if the file isn't there. */
export async function ogMark() {
  try {
    return `data:image/png;base64,${(await readFile(join(process.cwd(), "public/email/stayzim-mark.png"))).toString("base64")}`;
  } catch {
    return null;
  }
}

/** The 1280px copy from a srcset when there is one (smaller and quicker than the original), else the photo. */
export function mediumPhoto(url: string | null, srcSet: string | null) {
  const medium = srcSet
    ?.split(",")
    .map((entry) => entry.trim().split(/\s+/))
    .find(([, width]) => width === "1280w")?.[0];
  return medium ?? url;
}

/** A short hash of what a card shows, for its ?v=, so a new photo or name gets a new card past the caches. */
export function ogVersion(...parts: (string | null | undefined)[]) {
  let hash = 0;
  for (const char of parts.join("|")) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (hash >>> 0).toString(36);
}
