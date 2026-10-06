import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { env } from "@stayzim/env/server";
import { HTTPException } from "hono/http-exception";

/** Photos are resized on the owner's phone first, so anything near this is a mistake. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

/** File signatures, so a renamed .exe can't pass as a photo. */
const IMAGE_TYPES = [
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  // "RIFF", then "WEBP" at byte 8 (RIFF alone is also WAV and AVI)
  { ext: "webp", mime: "image/webp", magic: [0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50] },
] as const;

export function uploadRoot() {
  return UPLOAD_ROOT;
}

/** Public URL of a stored file, e.g. https://api.stayzim.co.zw/uploads/lodges/abc/xyz.jpg */
export function uploadUrl(key: string) {
  return `${env.BETTER_AUTH_URL}/uploads/${key}`;
}

/**
 * Checks an uploaded file is a JPG, PNG or WebP under the size limit and saves
 * it as `<folder>/<name>.<ext>`. Returns the key to store and its size.
 */
export async function saveImage(file: unknown, folder: string, name: string) {
  if (!(file instanceof File)) throw new HTTPException(400, { message: "Choose a photo to upload" });
  if (file.size === 0) throw new HTTPException(400, { message: "That photo is empty. Try another one." });
  if (file.size > MAX_UPLOAD_BYTES) throw new HTTPException(413, { message: "That photo is too big (5 MB at most)" });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = IMAGE_TYPES.find((candidate) => candidate.magic.every((byte, index) => byte === -1 || bytes[index] === byte));
  if (!type) throw new HTTPException(415, { message: "Use a JPG, PNG or WebP photo" });

  const key = `${folder}/${name}.${type.ext}`;
  const target = path.join(UPLOAD_ROOT, key);
  // Keys are built from ids we generate, but never write outside the upload folder
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) throw new HTTPException(400, { message: "Bad file name" });

  await mkdir(path.dirname(target), { recursive: true });
  await Bun.write(target, bytes);
  return { key, size: bytes.byteLength };
}

/** Deletes stored files. Missing files are fine (already gone). */
export async function removeUploads(keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      const target = path.join(UPLOAD_ROOT, key);
      if (!target.startsWith(UPLOAD_ROOT + path.sep)) return;
      await rm(target, { force: true }).catch((error) => console.error(`[uploads] could not delete ${key}:`, error));
    }),
  );
}

/**
 * GET /uploads/<key>. Keys contain a fresh id per file, so browsers and the
 * proxy may cache them forever.
 */
export async function serveUpload(requestPath: string) {
  const key = decodeURIComponent(requestPath.replace(/^\/uploads\//, ""));
  const target = path.join(UPLOAD_ROOT, key);
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) return null;
  const file = Bun.file(target);
  if (!(await file.exists())) return null;
  return new Response(file, {
    headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
