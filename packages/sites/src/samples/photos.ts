/**
 * The stock photos example content uses: files in apps/web/public/samples/,
 * each in three widths (name.jpg 1600px, name-md.jpg 1280px, name-sm.jpg
 * 640px). Written by `pnpm --filter web sample-photos` from the photos in
 * apps/web/public/samples/incoming/{group}/ (see its README.md): don't edit by
 * hand. Without photos, example rooms and galleries use the templates' soft
 * colour placeholders.
 */
import type { Setting } from "../content/facts";

export type SamplePhotoGroup = Setting | "rooms" | "food" | "outside";

export type SamplePhotoFile = { file: string; width: number; height: number };

export const SAMPLE_PHOTOS: Record<SamplePhotoGroup, SamplePhotoFile[]> = {
  mountains: [],
  lake: [],
  bush: [],
  river: [],
  city: [],
  farm: [],
  rooms: [],
  food: [],
  outside: [],
};
