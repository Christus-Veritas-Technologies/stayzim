import { env } from "@stayzim/env/web";
import { SETTING_KEYS, type DirectoryLodge } from "@stayzim/sites";
import { z } from "zod";

const directoryLodge = z.object({
  slug: z.string(),
  customDomain: z.string().nullable(),
  name: z.string(),
  town: z.string().nullable(),
  region: z.string().nullable(),
  setting: z.enum(SETTING_KEYS).nullable().catch(null),
  themeColor: z.string().catch("#1D5C7A"),
  hero: z.object({ url: z.string(), srcSet: z.string().nullable(), width: z.number(), height: z.number() }).nullable(),
  priceFrom: z.number().nullable(),
  updatedAt: z.string(),
}) satisfies z.ZodType<DirectoryLodge>;

/**
 * Every paid lodge whose site is up (GET /api/sites), for /lodges and the main
 * sitemap. Cached for 5 minutes. Empty if the API can't be reached, so the
 * page and sitemap still answer.
 */
export async function getDirectory(): Promise<DirectoryLodge[]> {
  const api = env.SERVER_INTERNAL_URL ?? env.NEXT_PUBLIC_SERVER_URL;
  try {
    const response = await fetch(`${api}/api/sites`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    return z.array(directoryLodge).parse(await response.json());
  } catch {
    return [];
  }
}

/** The directory by town ("Other places" last for lodges without one), towns A to Z. */
export function byTown(lodges: DirectoryLodge[]) {
  const towns = new Map<string, DirectoryLodge[]>();
  for (const lodge of lodges) {
    const town = lodge.town?.trim() || "Other places";
    towns.set(town, [...(towns.get(town) ?? []), lodge]);
  }
  return [...towns.entries()].sort(([a], [b]) => (a === "Other places" ? 1 : b === "Other places" ? -1 : a.localeCompare(b)));
}
