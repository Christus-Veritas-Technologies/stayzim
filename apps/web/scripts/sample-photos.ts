/**
 * Turns the photos in public/samples/incoming/{group}/ into the example photos
 * demo sites use: each one resized to 1600, 1280 and 640px wide (JPEG), saved
 * as public/samples/{group}-{n}.jpg, -md.jpg and -sm.jpg, and listed in
 * packages/sites/src/samples/photos.ts with its size. Groups: mountains, lake,
 * bush, river, city, farm, rooms, food, outside. Run it again after adding or
 * removing photos; it rebuilds everything from incoming/.
 *
 *   pnpm --filter web sample-photos
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

// sharp comes with Next (it resizes next/image), so no extra dependency
const require = createRequire(import.meta.url);
type Image = {
  rotate: () => Image;
  clone: () => Image;
  resize: (options: { width: number; withoutEnlargement: boolean }) => Image;
  jpeg: (options: { quality: number; mozjpeg: boolean }) => Image;
  toFile: (path: string) => Promise<{ width: number; height: number }>;
};
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next")] })) as (path: string) => Image;

const GROUPS = ["mountains", "lake", "bush", "river", "city", "farm", "rooms", "food", "outside"] as const;
const WIDTHS = [
  { suffix: "", width: 1600 },
  { suffix: "-md", width: 1280 },
  { suffix: "-sm", width: 640 },
] as const;

const root = new URL("..", import.meta.url).pathname;
const samples = join(root, "public/samples");
const incoming = join(samples, "incoming");
const manifest = join(root, "../../packages/sites/src/samples/photos.ts");

// Start clean: everything in public/samples except incoming/
for (const entry of await readdir(samples)) {
  if (entry !== "incoming" && entry.endsWith(".jpg")) await rm(join(samples, entry));
}

const list: Record<string, { file: string; width: number; height: number }[]> = {};
for (const group of GROUPS) {
  list[group] = [];
  const folder = join(incoming, group);
  await mkdir(folder, { recursive: true });
  const files = (await readdir(folder)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  for (const [index, name] of files.entries()) {
    const file = `${group}-${index + 1}`;
    const source = sharp(join(folder, name)).rotate();
    let size = { width: 0, height: 0 };
    for (const { suffix, width } of WIDTHS) {
      const out = await source
        .clone()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: suffix === "-sm" ? 72 : 78, mozjpeg: true })
        .toFile(join(samples, `${file}${suffix}.jpg`));
      if (suffix === "") size = { width: out.width, height: out.height };
    }
    list[group]!.push({ file, ...size });
    console.log(`${group}/${name} → ${file}.jpg (${size.width}×${size.height})`);
  }
}

const body = GROUPS.map((group) => `  ${group}: [${list[group]!.map((photo) => `\n    { file: "${photo.file}", width: ${photo.width}, height: ${photo.height} },`).join("")}${list[group]!.length ? "\n  " : ""}],`).join("\n");
await writeFile(
  manifest,
  `/**
 * The stock photos example content uses: files in apps/web/public/samples/,
 * each in three widths (name.jpg 1600px, name-md.jpg 1280px, name-sm.jpg
 * 640px). Written by \`pnpm --filter web sample-photos\` from the photos in
 * apps/web/public/samples/incoming/{group}/ (see its README.md): don't edit by
 * hand. Without photos, example rooms and galleries use the templates' soft
 * colour placeholders.
 */
import type { Setting } from "../content/facts";

export type SamplePhotoGroup = Setting | "rooms" | "food" | "outside";

export type SamplePhotoFile = { file: string; width: number; height: number };

export const SAMPLE_PHOTOS: Record<SamplePhotoGroup, SamplePhotoFile[]> = {
${body}
};
`,
);
console.log(`\nWrote ${Object.values(list).flat().length} photos to packages/sites/src/samples/photos.ts`);
