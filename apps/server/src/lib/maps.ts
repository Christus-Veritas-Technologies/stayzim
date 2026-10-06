/**
 * Finds the coordinates in a Google Maps link. Owners paste the link from
 * Share in Google Maps, which is usually a short maps.app.goo.gl link that
 * redirects to the full URL with the coordinates in it.
 */

const GOOGLE_HOST = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?)$/i;

const PATTERNS = [
  // .../place/.../@-18.2869,32.7414,15z
  /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
  // ...!3d-18.2869!4d32.7414 (the pin itself, more exact than the map centre)
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  // ?q=-18.2869,32.7414 or ?ll=… or ?query=…
  /[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i,
];

export type Coordinates = { latitude: number; longitude: number };

function valid(latitude: number, longitude: number): Coordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6 };
}

function fromText(text: string): Coordinates | null {
  // The pin (!3d!4d) beats the map centre (@) when both are there
  const ordered = [PATTERNS[1]!, PATTERNS[0]!, PATTERNS[2]!];
  for (const pattern of ordered) {
    const match = text.match(pattern);
    if (match) return valid(Number(match[1]), Number(match[2]));
  }
  return null;
}

/** null when the link isn't a Google Maps link or has no coordinates we can find. */
export async function coordinatesFromMapsUrl(raw: string): Promise<Coordinates | null> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  // Only ever follow Google's own redirects, never an arbitrary URL
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "https:" || !GOOGLE_HOST.test(url.hostname)) return null;
    const found = fromText(decodeURIComponent(url.href));
    if (found) return found;

    let response: Response;
    try {
      response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    } catch {
      return null;
    }
    const location = response.headers.get("location");
    if (!location) return null;
    url = new URL(location, url);
  }
  return null;
}
